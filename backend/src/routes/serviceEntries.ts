import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { parseFlexibleDate, isoToDate, toIso } from "../dates";
import { predictRecommendationSmart } from "../prediction";
import { getVehicleRole, canEditEntries } from "../auth";

const router = Router();

/**
 * Pulls optional VHMS / vehicle-health sensor readings from the request body.
 * It accepts values either inside body.vhms or directly on the body.
 * It supports both uppercase model feature names and lowercase field names.
 *
 * The trained Random Forest model requires all 9 feature values:
 * Crankshaft, Overheating, Lubricant, Misfires, Piston, Starter,
 * Temperature, Humidity and Altitude.
 *
 * If any value is missing, null is returned and the app safely falls back
 * to the normal rule-based recommendation.
 */
function extractVhms(body: Record<string, unknown>) {
  const src =
    body.vhms && typeof body.vhms === "object"
      ? (body.vhms as Record<string, unknown>)
      : body;

  const num = (value: unknown): number | undefined => {
    if (value === "" || value == null) return undefined;

    const parsed = typeof value === "number" ? value : Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const vhms = {
    Crankshaft: num(src.Crankshaft ?? src.crankshaft),
    Overheating: num(src.Overheating ?? src.overheating),
    Lubricant: num(src.Lubricant ?? src.lubricant),
    Misfires: num(src.Misfires ?? src.misfires),
    Piston: num(src.Piston ?? src.piston),
    Starter: num(src.Starter ?? src.starter),
    Temperature: num(src.Temperature ?? src.temperature),
    Humidity: num(src.Humidity ?? src.humidity),
    Altitude: num(src.Altitude ?? src.altitude),
  };

  const hasAllValues =
    vhms.Crankshaft != null &&
    vhms.Overheating != null &&
    vhms.Lubricant != null &&
    vhms.Misfires != null &&
    vhms.Piston != null &&
    vhms.Starter != null &&
    vhms.Temperature != null &&
    vhms.Humidity != null &&
    vhms.Altitude != null;

  return hasAllValues ? vhms : null;
}

/** Vehicle ids the current user can see (owns or has been given access to). */
async function accessibleVehicleIds(userId: string): Promise<string[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { OR: [{ ownerId: userId }, { accesses: { some: { userId } } }] },
    select: { id: true },
  });

  return vehicles.map((v) => v.id);
}

interface ParsedEntry {
  data: Record<string, unknown>;
}

/**
 * Validate and normalise the service-entry fields.
 * Dates are accepted in flexible formats and stored as clean dates.
 * The Recommended Service Date is always derived from the Service Date
 * and is never set manually.
 */
function parseEntryInput(
  body: unknown,
  partial: boolean
): { error: string } | ParsedEntry {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const data: Record<string, unknown> = {};

  const vehicleId = str(b.vehicleId);
  if (!partial && !vehicleId) return { error: "Please select a vehicle" };
  if (vehicleId) data.vehicleId = vehicleId;

  const entryType = str(b.entryType);
  if (!partial && !entryType) return { error: "Entry Type is required" };
  if (entryType) data.entryType = entryType;

  const serviceType = str(b.serviceType);
  if (!partial && !serviceType) return { error: "Service Type is required" };
  if (serviceType) data.serviceType = serviceType;

  const status = str(b.status);
  if (!partial && !status) return { error: "Status is required" };
  if (status) data.status = status;

  if (b.category !== undefined) data.category = str(b.category) || null;

  if (b.notes !== undefined) data.notes = str(b.notes) || null;

  if (b.amount !== undefined && b.amount !== null && b.amount !== "") {
    const amount = Number(b.amount);

    if (Number.isNaN(amount)) return { error: "Amount must be a number" };
    if (amount < 0) return { error: "Amount cannot be negative" };

    data.amount = amount;
  } else if (b.amount === "" || b.amount === null) {
    data.amount = null;
  }

  if (
    b.serviceDate !== undefined &&
    b.serviceDate !== null &&
    b.serviceDate !== ""
  ) {
    const iso = parseFlexibleDate(b.serviceDate);

    if (!iso) return { error: "Service Date is not a valid date" };

    data.serviceDate = isoToDate(iso);
  } else if (!partial) {
    return { error: "Service Date is required" };
  }

  if (b.motDueDate !== undefined) {
    if (b.motDueDate === null || b.motDueDate === "") {
      data.motDueDate = null;
    } else {
      const iso = parseFlexibleDate(b.motDueDate);

      if (!iso) return { error: "MOT Due Date is not a valid date" };

      data.motDueDate = isoToDate(iso);
    }
  }

  return { data };
}

// PREVIEW PREDICTION -------------------------------------------------------
// Lets the UI preview the recommended date and explanation before saving.
router.post("/predict", async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const vehicleId = s(b.vehicleId);

  if (!vehicleId) {
    return res.status(400).json({ error: "Please select a vehicle" });
  }

  const serviceIso = parseFlexibleDate(b.serviceDate);

  if (!serviceIso) {
    return res.status(400).json({ error: "Service Date is not a valid date" });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    return res.status(400).json({ error: "Selected vehicle does not exist" });
  }

  const role = await getVehicleRole(req.userId!, vehicleId);

  if (!canEditEntries(role)) {
    return res.status(403).json({
      error: "You don't have permission to add entries for this vehicle",
    });
  }

  const history = (
    await prisma.serviceEntry.findMany({
      where: { vehicleId },
      select: { serviceDate: true },
    })
  ).map((e) => toIso(e.serviceDate));

  const prediction = await predictRecommendationSmart({
    vehicle,
    entryType: s(b.entryType) || "Service",
    serviceType: s(b.serviceType) || "Full Service",
    category: s(b.category) || null,
    serviceDateIso: serviceIso,
    historyDatesIso: history,
    vhms: extractVhms(b),
  });

  res.json(prediction);
});

// CREATE -------------------------------------------------------------------
router.post("/", async (req: Request, res: Response) => {
  const parsed = parseEntryInput(req.body, false);

  if ("error" in parsed) {
    return res.status(400).json({ error: parsed.error });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId as string },
  });

  if (!vehicle) {
    return res.status(400).json({ error: "Selected vehicle does not exist" });
  }

  const role = await getVehicleRole(req.userId!, vehicle.id);

  if (!canEditEntries(role)) {
    return res.status(403).json({
      error: "You don't have permission to add entries for this vehicle",
    });
  }

  const serviceIso = toIso(parsed.data.serviceDate as Date);

  const history = (
    await prisma.serviceEntry.findMany({
      where: { vehicleId: vehicle.id },
      select: { serviceDate: true },
    })
  ).map((e) => toIso(e.serviceDate));

  const prediction = await predictRecommendationSmart({
    vehicle,
    entryType: parsed.data.entryType as string,
    serviceType: parsed.data.serviceType as string,
    category: (parsed.data.category as string | null) ?? null,
    serviceDateIso: serviceIso,
    historyDatesIso: history,
    vhms: extractVhms((req.body ?? {}) as Record<string, unknown>),
  });

  parsed.data.recommendedServiceDate = isoToDate(
    prediction.recommendedServiceDate
  );

  try {
    const entry = await prisma.serviceEntry.create({
      data: parsed.data as any,
      include: { vehicle: true },
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create entry" });
  }
});

// LIST ---------------------------------------------------------------------
// Only entries for vehicles the current user can access.
router.get("/", async (req: Request, res: Response) => {
  try {
    const ids = await accessibleVehicleIds(req.userId!);

    const entries = await prisma.serviceEntry.findMany({
      where: { vehicleId: { in: ids } },
      orderBy: { serviceDate: "desc" },
      include: { vehicle: true },
    });

    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list entries" });
  }
});

// GET ONE ------------------------------------------------------------------
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const entry = await prisma.serviceEntry.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true },
    });

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const role = await getVehicleRole(req.userId!, entry.vehicleId);

    if (!role) {
      return res.status(403).json({ error: "You don't have access to this entry" });
    }

    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get entry" });
  }
});

// UPDATE -------------------------------------------------------------------
router.put("/:id", async (req: Request, res: Response) => {
  const parsed = parseEntryInput(req.body, true);

  if ("error" in parsed) {
    return res.status(400).json({ error: parsed.error });
  }

  const existing = await prisma.serviceEntry.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "Entry not found" });
  }

  if (!canEditEntries(await getVehicleRole(req.userId!, existing.vehicleId))) {
    return res.status(403).json({
      error: "You don't have permission to edit this entry",
    });
  }

  const effectiveVehicleId =
    (parsed.data.vehicleId as string) ?? existing.vehicleId;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: effectiveVehicleId },
  });

  if (!vehicle) {
    return res.status(400).json({ error: "Selected vehicle does not exist" });
  }

  if (
    effectiveVehicleId !== existing.vehicleId &&
    !canEditEntries(await getVehicleRole(req.userId!, effectiveVehicleId))
  ) {
    return res.status(403).json({
      error: "You don't have permission to use that vehicle",
    });
  }

  const serviceIso = parsed.data.serviceDate
    ? toIso(parsed.data.serviceDate as Date)
    : toIso(existing.serviceDate);

  const entryType = (parsed.data.entryType as string) ?? existing.entryType;
  const serviceType = (parsed.data.serviceType as string) ?? existing.serviceType;

  const category =
    "category" in parsed.data
      ? (parsed.data.category as string | null)
      : existing.category;

  const history = (
    await prisma.serviceEntry.findMany({
      where: {
        vehicleId: effectiveVehicleId,
        NOT: { id: req.params.id },
      },
      select: { serviceDate: true },
    })
  ).map((e) => toIso(e.serviceDate));

  const prediction = await predictRecommendationSmart({
    vehicle,
    entryType,
    serviceType,
    category,
    serviceDateIso: serviceIso,
    historyDatesIso: history,
    vhms: extractVhms((req.body ?? {}) as Record<string, unknown>),
  });

  parsed.data.recommendedServiceDate = isoToDate(
    prediction.recommendedServiceDate
  );

  try {
    const entry = await prisma.serviceEntry.update({
      where: { id: req.params.id },
      data: parsed.data as any,
      include: { vehicle: true },
    });

    res.json(entry);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Entry not found" });
    }

    console.error(err);
    res.status(500).json({ error: "Could not update entry" });
  }
});

// DELETE -------------------------------------------------------------------
// Only the owner of the vehicle can delete entries.
router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.serviceEntry.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "Entry not found" });
  }

  const role = await getVehicleRole(req.userId!, existing.vehicleId);

  if (role !== "Owner") {
    return res.status(403).json({
      error: "Only the vehicle owner can delete entries",
    });
  }

  try {
    await prisma.serviceEntry.delete({
      where: { id: req.params.id },
    });

    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Entry not found" });
    }

    console.error(err);
    res.status(500).json({ error: "Could not delete entry" });
  }
});

export default router;
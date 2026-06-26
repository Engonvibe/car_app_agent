import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { parseFlexibleDate, isoToDate, toIso } from "../dates";
import { predictRecommendation } from "../prediction";
import { getVehicleRole, canEditEntries } from "../auth";

const router = Router();

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
 * (it is never set manually).
 */
function parseEntryInput(
  body: unknown,
  partial: boolean
): { error: string } | ParsedEntry {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const data: Record<string, unknown> = {};

  // vehicleId
  const vehicleId = str(b.vehicleId);
  if (!partial && !vehicleId) return { error: "Please select a vehicle" };
  if (vehicleId) data.vehicleId = vehicleId;

  // entryType
  const entryType = str(b.entryType);
  if (!partial && !entryType) return { error: "Entry Type is required" };
  if (entryType) data.entryType = entryType;

  // serviceType
  const serviceType = str(b.serviceType);
  if (!partial && !serviceType) return { error: "Service Type is required" };
  if (serviceType) data.serviceType = serviceType;

  // status
  const status = str(b.status);
  if (!partial && !status) return { error: "Status is required" };
  if (status) data.status = status;

  // category (optional)
  if (b.category !== undefined) data.category = str(b.category) || null;

  // notes (optional)
  if (b.notes !== undefined) data.notes = str(b.notes) || null;

  // amount (optional, non-negative)
  if (b.amount !== undefined && b.amount !== null && b.amount !== "") {
    const amount = Number(b.amount);
    if (Number.isNaN(amount)) return { error: "Amount must be a number" };
    if (amount < 0) return { error: "Amount cannot be negative" };
    data.amount = amount;
  } else if (b.amount === "" || b.amount === null) {
    data.amount = null;
  }

  // serviceDate (required on create). The Recommended Service Date is derived
  // from this by the prediction engine in the route handler (not here).
  if (b.serviceDate !== undefined && b.serviceDate !== null && b.serviceDate !== "") {
    const iso = parseFlexibleDate(b.serviceDate);
    if (!iso) return { error: "Service Date is not a valid date" };
    data.serviceDate = isoToDate(iso);
  } else if (!partial) {
    return { error: "Service Date is required" };
  }

  // motDueDate (optional, kept SEPARATE from recommendedServiceDate)
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
// Lets the UI preview the recommended date + explanation before saving.
router.post("/predict", async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const vehicleId = s(b.vehicleId);
  if (!vehicleId) return res.status(400).json({ error: "Please select a vehicle" });

  const serviceIso = parseFlexibleDate(b.serviceDate);
  if (!serviceIso) return res.status(400).json({ error: "Service Date is not a valid date" });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return res.status(400).json({ error: "Selected vehicle does not exist" });

  const role = await getVehicleRole(req.userId!, vehicleId);
  if (!canEditEntries(role)) {
    return res.status(403).json({ error: "You don't have permission to add entries for this vehicle" });
  }

  const history = (
    await prisma.serviceEntry.findMany({ where: { vehicleId }, select: { serviceDate: true } })
  ).map((e) => toIso(e.serviceDate));

  const prediction = predictRecommendation({
    vehicle,
    entryType: s(b.entryType) || "Service",
    serviceType: s(b.serviceType) || "Full Service",
    category: s(b.category) || null,
    serviceDateIso: serviceIso,
    historyDatesIso: history,
  });

  res.json(prediction);
});

// CREATE -------------------------------------------------------------------
router.post("/", async (req: Request, res: Response) => {
  const parsed = parseEntryInput(req.body, false);
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  // Entry must belong to an existing vehicle.
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId as string },
  });
  if (!vehicle) return res.status(400).json({ error: "Selected vehicle does not exist" });

  // Only the owner or an editor of that vehicle may add entries.
  const role = await getVehicleRole(req.userId!, vehicle.id);
  if (!canEditEntries(role)) {
    return res.status(403).json({ error: "You don't have permission to add entries for this vehicle" });
  }

  // Derive the Recommended Service Date from the prediction engine.
  const serviceIso = toIso(parsed.data.serviceDate as Date);
  const history = (
    await prisma.serviceEntry.findMany({
      where: { vehicleId: vehicle.id },
      select: { serviceDate: true },
    })
  ).map((e) => toIso(e.serviceDate));

  const prediction = predictRecommendation({
    vehicle,
    entryType: parsed.data.entryType as string,
    serviceType: parsed.data.serviceType as string,
    category: (parsed.data.category as string | null) ?? null,
    serviceDateIso: serviceIso,
    historyDatesIso: history,
  });
  parsed.data.recommendedServiceDate = isoToDate(prediction.recommendedServiceDate);

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

// LIST (only entries for vehicles I can access) ----------------------------
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
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    const role = await getVehicleRole(req.userId!, entry.vehicleId);
    if (!role) return res.status(403).json({ error: "You don't have access to this entry" });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get entry" });
  }
});

// UPDATE -------------------------------------------------------------------
router.put("/:id", async (req: Request, res: Response) => {
  const parsed = parseEntryInput(req.body, true);
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  // We re-run the prediction from the EFFECTIVE entry (existing values merged
  // with this update), so the Recommended Service Date stays correct whenever
  // the vehicle, service date, service type, category or entry type changes.
  const existing = await prisma.serviceEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Entry not found" });

  // Need edit rights on the entry's current vehicle.
  if (!canEditEntries(await getVehicleRole(req.userId!, existing.vehicleId))) {
    return res.status(403).json({ error: "You don't have permission to edit this entry" });
  }

  const effectiveVehicleId = (parsed.data.vehicleId as string) ?? existing.vehicleId;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: effectiveVehicleId } });
  if (!vehicle) return res.status(400).json({ error: "Selected vehicle does not exist" });

  // If moving the entry to a different vehicle, need edit rights there too.
  if (effectiveVehicleId !== existing.vehicleId &&
      !canEditEntries(await getVehicleRole(req.userId!, effectiveVehicleId))) {
    return res.status(403).json({ error: "You don't have permission to use that vehicle" });
  }

  const serviceIso = parsed.data.serviceDate
    ? toIso(parsed.data.serviceDate as Date)
    : toIso(existing.serviceDate);
  const entryType = (parsed.data.entryType as string) ?? existing.entryType;
  const serviceType = (parsed.data.serviceType as string) ?? existing.serviceType;
  const category =
    "category" in parsed.data ? (parsed.data.category as string | null) : existing.category;

  const history = (
    await prisma.serviceEntry.findMany({
      where: { vehicleId: effectiveVehicleId, NOT: { id: req.params.id } },
      select: { serviceDate: true },
    })
  ).map((e) => toIso(e.serviceDate));

  const prediction = predictRecommendation({
    vehicle,
    entryType,
    serviceType,
    category,
    serviceDateIso: serviceIso,
    historyDatesIso: history,
  });
  // Note: this only updates recommendedServiceDate. motDueDate is left exactly
  // as provided/stored — the prediction never touches the MOT Due Date.
  parsed.data.recommendedServiceDate = isoToDate(prediction.recommendedServiceDate);

  try {
    const entry = await prisma.serviceEntry.update({
      where: { id: req.params.id },
      data: parsed.data as any,
      include: { vehicle: true },
    });
    res.json(entry);
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Entry not found" });
    console.error(err);
    res.status(500).json({ error: "Could not update entry" });
  }
});

// DELETE (owner of the vehicle only) ---------------------------------------
router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.serviceEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Entry not found" });

  const role = await getVehicleRole(req.userId!, existing.vehicleId);
  if (role !== "Owner") {
    return res.status(403).json({ error: "Only the vehicle owner can delete entries" });
  }

  try {
    await prisma.serviceEntry.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Entry not found" });
    console.error(err);
    res.status(500).json({ error: "Could not delete entry" });
  }
});

export default router;

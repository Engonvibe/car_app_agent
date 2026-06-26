import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

const CURRENT_YEAR = new Date().getFullYear();

const userSelect = { id: true, name: true, email: true } as const;
const vehicleInclude = {
  owner: { select: userSelect },
  accesses: { include: { user: { select: userSelect } } },
} as const;

/** Shape a vehicle for the client, including who can access it and my role. */
function serialize(vehicle: any, userId: string) {
  const myRole =
    vehicle.ownerId === userId
      ? "Owner"
      : vehicle.accesses?.find((a: any) => a.userId === userId)?.role ?? null;
  return {
    id: vehicle.id,
    brandName: vehicle.brandName,
    model: vehicle.model,
    registeredYear: vehicle.registeredYear,
    fuelType: vehicle.fuelType,
    registrationNumber: vehicle.registrationNumber,
    vehicleType: vehicle.vehicleType,
    mileage: vehicle.mileage,
    ownerId: vehicle.ownerId,
    owner: vehicle.owner ?? null,
    accesses: (vehicle.accesses ?? []).map((a: any) => ({
      userId: a.userId,
      role: a.role,
      user: a.user,
    })),
    myRole,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}

function parseVehicleInput(body: unknown, partial = false) {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const brandName = str(b.brandName);
  const model = str(b.model);
  const fuelType = str(b.fuelType);
  const registrationNumber = str(b.registrationNumber).toUpperCase();
  const vehicleType = str(b.vehicleType);

  if (!partial) {
    if (!brandName) return { error: "Vehicle Brand Name is required" };
    if (!model) return { error: "Vehicle Model is required" };
    if (!fuelType) return { error: "Fuel Type is required" };
    if (!registrationNumber) return { error: "Registration Number is required" };
  }

  let registeredYear: number | undefined;
  if (b.registeredYear !== undefined && b.registeredYear !== null && b.registeredYear !== "") {
    registeredYear = Number(b.registeredYear);
    if (!Number.isInteger(registeredYear) || registeredYear < 1900 || registeredYear > CURRENT_YEAR + 1) {
      return { error: `Registered Year must be between 1900 and ${CURRENT_YEAR + 1}` };
    }
  } else if (!partial) {
    return { error: "Registered Year is required" };
  }

  let mileage: number | null | undefined;
  if (b.mileage === undefined || b.mileage === null || b.mileage === "") {
    mileage = partial ? undefined : null;
  } else {
    mileage = Number(b.mileage);
    if (!Number.isInteger(mileage) || mileage < 0) {
      return { error: "Mileage must be a positive whole number" };
    }
  }

  const data: Record<string, unknown> = {};
  if (brandName || !partial) data.brandName = brandName;
  if (model || !partial) data.model = model;
  if (fuelType || !partial) data.fuelType = fuelType;
  if (registrationNumber || !partial) data.registrationNumber = registrationNumber;
  if (registeredYear !== undefined) data.registeredYear = registeredYear;
  data.vehicleType = vehicleType || null;
  if (mileage !== undefined) data.mileage = mileage;

  return { data };
}

// CREATE -------------------------------------------------------------------
router.post("/", async (req: Request, res: Response) => {
  const parsed = parseVehicleInput(req.body, false);
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  try {
    const vehicle = await prisma.vehicle.create({
      data: { ...(parsed.data as any), ownerId: req.userId! },
      include: vehicleInclude,
    });
    res.status(201).json(serialize(vehicle, req.userId!));
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "A vehicle with that Registration Number already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Could not create vehicle" });
  }
});

// LIST (only vehicles I own or have been given access to) -------------------
router.get("/", async (req: Request, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { OR: [{ ownerId: req.userId }, { accesses: { some: { userId: req.userId } } }] },
      orderBy: { createdAt: "desc" },
      include: vehicleInclude,
    });
    res.json(vehicles.map((v) => serialize(v, req.userId!)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list vehicles" });
  }
});

// GET ONE ------------------------------------------------------------------
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: vehicleInclude,
    });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    const serialized = serialize(vehicle, req.userId!);
    if (!serialized.myRole) return res.status(403).json({ error: "You don't have access to this vehicle" });
    res.json(serialized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get vehicle" });
  }
});

// UPDATE (owner only) ------------------------------------------------------
router.put("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Vehicle not found" });
  if (existing.ownerId !== req.userId) {
    return res.status(403).json({ error: "Only the owner can edit this vehicle" });
  }

  const parsed = parseVehicleInput(req.body, true);
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: parsed.data as any,
      include: vehicleInclude,
    });
    res.json(serialize(vehicle, req.userId!));
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "A vehicle with that Registration Number already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Could not update vehicle" });
  }
});

// DELETE (owner only) ------------------------------------------------------
router.delete("/:id", async (req: Request, res: Response) => {
  const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Vehicle not found" });
  if (existing.ownerId !== req.userId) {
    return res.status(403).json({ error: "Only the owner can delete this vehicle" });
  }
  await prisma.vehicle.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ASSIGN / UPDATE ACCESS (owner only) --------------------------------------
router.post("/:id/access", async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const role = typeof b.role === "string" ? b.role.trim() : "";

  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  if (vehicle.ownerId !== req.userId) {
    return res.status(403).json({ error: "Only the owner can manage access" });
  }
  if (role !== "Editor" && role !== "Viewer") {
    return res.status(400).json({ error: "Role must be Editor or Viewer" });
  }

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return res.status(404).json({ error: "No registered user with that email" });
  if (target.id === vehicle.ownerId) {
    return res.status(400).json({ error: "That user is already the owner" });
  }

  await prisma.vehicleAccess.upsert({
    where: { vehicleId_userId: { vehicleId: vehicle.id, userId: target.id } },
    update: { role },
    create: { vehicleId: vehicle.id, userId: target.id, role },
  });

  const updated = await prisma.vehicle.findUnique({
    where: { id: vehicle.id },
    include: vehicleInclude,
  });
  res.json(serialize(updated, req.userId!));
});

// REMOVE ACCESS (owner only) -----------------------------------------------
router.delete("/:id/access/:userId", async (req: Request, res: Response) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  if (vehicle.ownerId !== req.userId) {
    return res.status(403).json({ error: "Only the owner can manage access" });
  }

  await prisma.vehicleAccess
    .delete({ where: { vehicleId_userId: { vehicleId: vehicle.id, userId: req.params.userId } } })
    .catch(() => null); // ignore if it wasn't there

  const updated = await prisma.vehicle.findUnique({
    where: { id: vehicle.id },
    include: vehicleInclude,
  });
  res.json(serialize(updated, req.userId!));
});

export default router;

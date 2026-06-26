import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import {
  parseFlexibleDate,
  toIso,
  isoToday,
  reminderStatus,
} from "../dates";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function vehicleLabel(v: { brandName: string; model: string; registrationNumber: string }): string {
  return `${v.brandName} ${v.model} (${v.registrationNumber})`;
}

/** Vehicle ids the current user can see (owns or has access to). */
async function accessibleVehicleIds(userId: string): Promise<string[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { OR: [{ ownerId: userId }, { accesses: { some: { userId } } }] },
    select: { id: true },
  });
  return vehicles.map((v) => v.id);
}

// ===========================================================================
// DASHBOARD  ->  GET /api/dashboard/summary
// ===========================================================================
export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (req: Request, res: Response) => {
  try {
    const ids = await accessibleVehicleIds(req.userId!);
    const [vehicleCount, entries] = await Promise.all([
      Promise.resolve(ids.length),
      prisma.serviceEntry.findMany({ where: { vehicleId: { in: ids } }, include: { vehicle: true } }),
    ]);

    const today = isoToday();
    const thisMonth = today.slice(0, 7); // "YYYY-MM"

    // Total cost this month (by service date).
    let costThisMonth = 0;
    for (const e of entries) {
      if (e.amount != null && toIso(e.serviceDate).slice(0, 7) === thisMonth) {
        costThisMonth += e.amount;
      }
    }

    // Monthly cost bar chart data (grouped by service-date month).
    const monthlyMap = new Map<string, number>();
    for (const e of entries) {
      const ym = toIso(e.serviceDate).slice(0, 7);
      monthlyMap.set(ym, (monthlyMap.get(ym) ?? 0) + (e.amount ?? 0));
    }
    const monthlyCost = [...monthlyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, total]) => ({ month: ym, label: monthLabel(ym), total: Number(total.toFixed(2)) }));

    // Most common service types (the "item" bar chart).
    const typeMap = new Map<string, number>();
    for (const e of entries) {
      typeMap.set(e.serviceType, (typeMap.get(e.serviceType) ?? 0) + 1);
    }
    const topServiceTypes = [...typeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    // Entry status bar chart.
    const statusMap = new Map<string, number>();
    for (const e of entries) {
      statusMap.set(e.status, (statusMap.get(e.status) ?? 0) + 1);
    }
    const statusCounts = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

    // Upcoming recommended services (today or later).
    const upcoming = entries
      .filter((e) => e.recommendedServiceDate && toIso(e.recommendedServiceDate) >= today)
      .sort((a, b) => toIso(a.recommendedServiceDate!).localeCompare(toIso(b.recommendedServiceDate!)));

    const topUpcoming = upcoming.slice(0, 3).map((e) => ({
      id: e.id,
      vehicle: e.vehicle ? vehicleLabel(e.vehicle) : "Vehicle",
      serviceType: e.serviceType,
      recommendedServiceDate: toIso(e.recommendedServiceDate!),
    }));

    res.json({
      totals: {
        vehicles: vehicleCount,
        entries: entries.length,
        upcomingServices: upcoming.length,
        costThisMonth: Number(costThisMonth.toFixed(2)),
      },
      monthlyCost,
      topServiceTypes,
      statusCounts,
      topUpcoming,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load dashboard summary" });
  }
});

// ===========================================================================
// REPORTS  ->  GET /api/reports?fromDate=&toDate=
// ===========================================================================
export const reportsRouter = Router();

reportsRouter.get("/", async (req: Request, res: Response) => {
  const fromRaw = req.query.fromDate;
  const toRaw = req.query.toDate;

  let fromIso: string | null = null;
  let toIsoStr: string | null = null;

  if (typeof fromRaw === "string" && fromRaw.trim()) {
    fromIso = parseFlexibleDate(fromRaw);
    if (!fromIso) return res.status(400).json({ error: "From Date is not a valid date" });
  }
  if (typeof toRaw === "string" && toRaw.trim()) {
    toIsoStr = parseFlexibleDate(toRaw);
    if (!toIsoStr) return res.status(400).json({ error: "To Date is not a valid date" });
  }
  if (fromIso && toIsoStr && fromIso > toIsoStr) {
    return res.status(400).json({ error: "From Date must be on or before To Date" });
  }

  try {
    const ids = await accessibleVehicleIds(req.userId!);
    const all = await prisma.serviceEntry.findMany({
      where: { vehicleId: { in: ids } },
      orderBy: { serviceDate: "desc" },
      include: { vehicle: true },
    });

    const entries = all.filter((e) => {
      const d = toIso(e.serviceDate);
      if (fromIso && d < fromIso) return false;
      if (toIsoStr && d > toIsoStr) return false;
      return true;
    });

    const totalCost = entries.reduce((sum, e) => sum + (e.amount ?? 0), 0);

    res.json({
      fromDate: fromIso,
      toDate: toIsoStr,
      count: entries.length,
      totalCost: Number(totalCost.toFixed(2)),
      entries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not build report" });
  }
});

// ===========================================================================
// REMINDERS  ->  GET /api/reminders
// ===========================================================================
export const remindersRouter = Router();

remindersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const ids = await accessibleVehicleIds(req.userId!);
    const entries = await prisma.serviceEntry.findMany({
      where: { vehicleId: { in: ids } },
      include: { vehicle: true },
    });

    type Reminder = {
      id: string;
      entryId: string;
      type: "Recommended Service" | "MOT Due";
      vehicle: string;
      serviceType: string;
      date: string;
      status: "Overdue" | "Due" | "Upcoming";
    };

    const reminders: Reminder[] = [];

    for (const e of entries) {
      if (e.status === "Cancelled") continue;
      const vehicle = e.vehicle ? vehicleLabel(e.vehicle) : "Vehicle";

      if (e.recommendedServiceDate) {
        const date = toIso(e.recommendedServiceDate);
        reminders.push({
          id: `${e.id}-svc`,
          entryId: e.id,
          type: "Recommended Service",
          vehicle,
          serviceType: e.serviceType,
          date,
          status: reminderStatus(date),
        });
      }

      // MOT due date is kept SEPARATE from the recommended service date.
      if (e.motDueDate) {
        const date = toIso(e.motDueDate);
        reminders.push({
          id: `${e.id}-mot`,
          entryId: e.id,
          type: "MOT Due",
          vehicle,
          serviceType: e.serviceType,
          date,
          status: reminderStatus(date),
        });
      }
    }

    reminders.sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      today: isoToday(),
      recommendedServices: reminders.filter((r) => r.type === "Recommended Service"),
      motDue: reminders.filter((r) => r.type === "MOT Due"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load reminders" });
  }
});

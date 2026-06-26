import "dotenv/config";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";
import { isoToDate, toIso } from "./dates";
import { predictRecommendation } from "./prediction";

/* ---------------------------------------------------------------------------
   Seed demo accounts and sample data for easy testing.

   Run with:  npm run seed

   Demo logins (all password: password123):
     Owner :  demo@motcare.local
     Editor:  editor@motcare.local   (Editor on the demo vehicle)
     Viewer:  viewer@motcare.local   (Viewer on the demo vehicle)

   Safe to run multiple times (uses upserts / existence checks).
--------------------------------------------------------------------------- */

async function main() {
  const password = await hashPassword("password123");

  const owner = await prisma.user.upsert({
    where: { email: "demo@motcare.local" },
    update: { passwordHash: password },
    create: { name: "Demo Owner", email: "demo@motcare.local", passwordHash: password },
  });
  const editor = await prisma.user.upsert({
    where: { email: "editor@motcare.local" },
    update: { passwordHash: password },
    create: { name: "Demo Editor", email: "editor@motcare.local", passwordHash: password },
  });
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@motcare.local" },
    update: { passwordHash: password },
    create: { name: "Demo Viewer", email: "viewer@motcare.local", passwordHash: password },
  });

  // Demo vehicle owned by the Owner.
  const vehicle = await prisma.vehicle.upsert({
    where: { registrationNumber: "DV19 MOT" },
    update: { ownerId: owner.id },
    create: {
      brandName: "Ford",
      model: "Focus",
      registeredYear: 2019,
      fuelType: "Petrol",
      registrationNumber: "DV19 MOT",
      vehicleType: "Hatchback",
      mileage: 45000,
      ownerId: owner.id,
    },
  });

  // Give the editor/viewer access to the demo vehicle.
  await prisma.vehicleAccess.upsert({
    where: { vehicleId_userId: { vehicleId: vehicle.id, userId: editor.id } },
    update: { role: "Editor" },
    create: { vehicleId: vehicle.id, userId: editor.id, role: "Editor" },
  });
  await prisma.vehicleAccess.upsert({
    where: { vehicleId_userId: { vehicleId: vehicle.id, userId: viewer.id } },
    update: { role: "Viewer" },
    create: { vehicleId: vehicle.id, userId: viewer.id, role: "Viewer" },
  });

  // Add a couple of sample entries if the vehicle has none yet.
  const existingEntries = await prisma.serviceEntry.count({ where: { vehicleId: vehicle.id } });
  if (existingEntries === 0) {
    const samples = [
      { entryType: "Service", serviceType: "Full Service", serviceDate: "2025-05-12", amount: 199, status: "Done" },
      { entryType: "Service", serviceType: "Oil Change", serviceDate: "2025-11-12", amount: 79.99, status: "Done" },
    ];
    for (const s of samples) {
      const pred = predictRecommendation({
        vehicle,
        entryType: s.entryType,
        serviceType: s.serviceType,
        serviceDateIso: s.serviceDate,
        historyDatesIso: [],
      });
      await prisma.serviceEntry.create({
        data: {
          vehicleId: vehicle.id,
          entryType: s.entryType,
          serviceType: s.serviceType,
          serviceDate: isoToDate(s.serviceDate),
          recommendedServiceDate: isoToDate(pred.recommendedServiceDate),
          amount: s.amount,
          status: s.status,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("  Owner :  demo@motcare.local   / password123");
  console.log("  Editor:  editor@motcare.local / password123");
  console.log("  Viewer:  viewer@motcare.local / password123");
  console.log(`  Demo vehicle: ${vehicle.brandName} ${vehicle.model} (${vehicle.registrationNumber}), entries seeded: ${toIso(new Date())}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

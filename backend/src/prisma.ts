import { PrismaClient } from "@prisma/client";

// A single shared Prisma client instance for the whole backend.
// (Creating many clients can exhaust database connections.)
export const prisma = new PrismaClient();

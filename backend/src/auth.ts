import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

/* ---------------------------------------------------------------------------
   Authentication & permission helpers.

   - Passwords are hashed with bcrypt (never stored in plain text).
   - Login issues a signed JWT token; the frontend sends it back as
     "Authorization: Bearer <token>" on each request.
   - requireAuth checks the token and puts the user id on req.userId.
   - getVehicleRole works out a user's role for a vehicle:
       "Owner"  -> full control (they own the vehicle)
       "Editor" -> can add/edit entries
       "Viewer" -> read-only
       null     -> no access
--------------------------------------------------------------------------- */

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
if (!process.env.AUTH_SECRET) {
  console.warn("[auth] AUTH_SECRET is not set — using an insecure dev fallback.");
}

export type VehicleRole = "Owner" | "Editor" | "Viewer";

// Extend Express Request with the authenticated user id.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, AUTH_SECRET, { expiresIn: "7d" });
}

/** Express middleware: require a valid token, set req.userId. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in" });

  try {
    const payload = jwt.verify(token, AUTH_SECRET) as { sub?: string };
    if (!payload.sub) return res.status(401).json({ error: "Invalid session" });
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please log in again" });
  }
}

/** Work out a user's role for a vehicle (or null if they have no access). */
export async function getVehicleRole(
  userId: string,
  vehicleId: string
): Promise<VehicleRole | null> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return null;
  if (vehicle.ownerId === userId) return "Owner";

  const access = await prisma.vehicleAccess.findUnique({
    where: { vehicleId_userId: { vehicleId, userId } },
  });
  if (!access) return null;
  return access.role === "Editor" ? "Editor" : "Viewer";
}

/** Can this role add/edit service entries? (Owner or Editor) */
export function canEditEntries(role: VehicleRole | null): boolean {
  return role === "Owner" || role === "Editor";
}

/** A safe public view of a user (never expose the password hash). */
export function publicUser(u: { id: string; name: string; email: string }) {
  return { id: u.id, name: u.name, email: u.email };
}

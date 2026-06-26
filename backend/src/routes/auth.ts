import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  publicUser,
} from "../auth";

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// REGISTER -----------------------------------------------------------------
router.post("/register", async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!name) return res.status(400).json({ error: "Please enter your name" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Please enter a valid email" });
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "An account with that email already exists" });

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

// LOGIN --------------------------------------------------------------------
router.post("/login", async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";

  const user = await prisma.user.findUnique({ where: { email } });
  // Use the same message for "no user" and "wrong password" (don't leak which).
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  res.json({ token: signToken(user.id), user: publicUser(user) });
});

// CURRENT USER -------------------------------------------------------------
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

// LOGOUT -------------------------------------------------------------------
// Tokens are stateless (JWT), so logout is handled by the client deleting the
// token. This endpoint exists so the frontend has something to call.
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export default router;

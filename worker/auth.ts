import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import { randomToken, sha256Hex } from "../src/shared/password";
import { createSession, deleteSession, userForSession, type User } from "./data";

const COOKIE = "pb_session";

type Ctx = Context<{ Bindings: Env }>;

export async function currentUser(c: Ctx): Promise<User | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  return userForSession(c.env.DB, await sha256Hex(token), new Date().toISOString());
}

export async function startSession(c: Ctx, userId: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await createSession(c.env.DB, crypto.randomUUID(), userId, await sha256Hex(token), expires.toISOString());
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function endSession(c: Ctx) {
  const token = getCookie(c, COOKIE);
  if (token) await deleteSession(c.env.DB, await sha256Hex(token));
  deleteCookie(c, COOKIE, { path: "/" });
}

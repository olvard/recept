import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "recept_editor";
const MAX_AGE = 60 * 60 * 12;
function secret() { const value = process.env.RECEPT_SESSION_SECRET; if (!value) throw new Error("Sessionshemlighet saknas."); return value; }
function signature(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
export function sessionValue() { const payload = `${Math.floor(Date.now() / 1000) + MAX_AGE}`; return `${payload}.${signature(payload)}`; }
export function validSession(value?: string) { if (!value) return false; const [expiry, received] = value.split("."); if (!expiry || !received || Number(expiry) < Math.floor(Date.now() / 1000)) return false; const expected = signature(expiry); return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected)); }
export async function isEditor() { return validSession((await cookies()).get(COOKIE)?.value); }
export const editorCookie = { name: COOKIE, options: { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge: MAX_AGE } };
export function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; }

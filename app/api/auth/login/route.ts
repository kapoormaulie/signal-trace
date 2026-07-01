import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, saveSession } from "@/lib/redis";
import { verifyPassword, generateSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email: string = (body?.email ?? "").trim().toLowerCase();
    const password: string = body?.password ?? "";

    const genericError = NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    if (!email || !password) return genericError;

    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) return genericError;

    const token = generateSessionToken();
    await saveSession(token, user.id, SESSION_TTL_SECONDS);

    const res = NextResponse.json({ user: { id: user.id, email: user.email } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    log(`Logged in: ${user.email}`);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Login error: ${msg}`);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

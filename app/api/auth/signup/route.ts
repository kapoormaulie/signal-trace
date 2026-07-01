import { NextRequest, NextResponse } from "next/server";
import { createUser, saveSession } from "@/lib/redis";
import { hashPassword, generateSessionToken, isValidEmail, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email: string = (body?.email ?? "").trim().toLowerCase();
    const password: string = body?.password ?? "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const user = await createUser(email, passwordHash).catch((err) => {
      if (err instanceof Error && err.message === "EMAIL_TAKEN") return null;
      throw err;
    });
    if (!user) {
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
    }

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
    log(`Signed up: ${user.email}`);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Signup error: ${msg}`);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}

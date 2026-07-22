import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserIcp, saveUserIcp } from "@/lib/redis";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await getUserIcp(user.id);
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const profile = await req.json();
    await saveUserIcp(user.id, profile);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`ICP profile save error: ${msg}`);
    return NextResponse.json({ error: "Failed to save ICP profile" }, { status: 500 });
  }
}

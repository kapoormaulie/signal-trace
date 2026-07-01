import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserSettings, saveUserSettings } from "@/lib/redis";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const settings = await getUserSettings(user.id);
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const settings = await req.json();
    await saveUserSettings(user.id, settings);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Settings save error: ${msg}`);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

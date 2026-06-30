import { NextRequest, NextResponse } from "next/server";
import { appendLpVisit } from "@/lib/redis";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const visitedAt = new Date().toISOString();
    await appendLpVisit(slug, visitedAt);
    log(`LP visit: slug=${slug} at ${visitedAt}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`LP visit error: ${msg}`);
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }
}

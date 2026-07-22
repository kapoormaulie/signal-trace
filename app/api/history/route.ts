import { NextRequest, NextResponse } from "next/server";
import { getAllProspects, saveProspect, getProspect } from "@/lib/redis";
import { log } from "@/lib/logger";
import type { ProspectRecord, ReplyStatus } from "@/types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    // scopeId is either a per-browser deviceId or, once logged in, the account's userId
    const scopeId = req.nextUrl.searchParams.get("scopeId") || undefined;
    if (!scopeId) return NextResponse.json({ prospects: [] });

    const prospects = await getAllProspects(scopeId);
    const now = Date.now();

    const annotated = prospects.map((p) => ({
      ...p,
      lpUnopenedFlag:
        p.lpVisits.length === 0 &&
        now - new Date(p.contactedAt).getTime() > SEVEN_DAYS_MS,
    }));

    return NextResponse.json({ prospects: annotated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`History GET error: ${msg}`);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const record: ProspectRecord = await req.json();

    if (!record.id || !record.name || !record.company) {
      return NextResponse.json({ error: "id, name, and company are required" }, { status: 400 });
    }

    await saveProspect(record);
    log(`Saved prospect: ${record.name} at ${record.company} (id=${record.id}, slug=${record.lpSlug})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`History POST error: ${msg}`);
    return NextResponse.json({ error: "Failed to save prospect" }, { status: 500 });
  }
}

const VALID_REPLY_STATUSES: ReplyStatus[] = ["positive", "neutral", "negative", "bounced"];

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id: string = body?.id;
    const replyStatus: ReplyStatus | null = body?.replyStatus ?? null;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (replyStatus !== null && !VALID_REPLY_STATUSES.includes(replyStatus)) {
      return NextResponse.json({ error: "Invalid replyStatus" }, { status: 400 });
    }

    const record = await getProspect(id);
    if (!record) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    const updated: ProspectRecord = { ...record, replyStatus: replyStatus ?? undefined };
    await saveProspect(updated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`History PATCH error: ${msg}`);
    return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 });
  }
}

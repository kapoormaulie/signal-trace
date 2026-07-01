import { Redis } from "@upstash/redis";
import type { ProspectRecord, LandingPageContent } from "@/types";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEYS = {
  prospect: (id: string) => `prospect:${id}`,
  prospectIndex: "prospects:index",          // sorted set: score=contactedAt ms, member=id — all devices, used for duplicate detection
  prospectDeviceIndex: (deviceId: string) => `prospects:index:${deviceId}`, // per-device sorted set — used to scope the /history page
  lp: (slug: string) => `lp:${slug}`,
  lpToProspect: (slug: string) => `lp-to-prospect:${slug}`, // reverse index for visit tracking
} as const;

// ── Prospects ──────────────────────────────────────────────────────────────

export async function saveProspect(record: ProspectRecord): Promise<void> {
  const score = new Date(record.contactedAt).getTime();
  const ops = [
    redis.set(KEYS.prospect(record.id), record),
    redis.zadd(KEYS.prospectIndex, { score, member: record.id }),
    redis.set(KEYS.lpToProspect(record.lpSlug), record.id),
  ];
  if (record.deviceId) {
    ops.push(redis.zadd(KEYS.prospectDeviceIndex(record.deviceId), { score, member: record.id }));
  }
  await Promise.all(ops);
}

export async function getProspect(id: string): Promise<ProspectRecord | null> {
  return redis.get<ProspectRecord>(KEYS.prospect(id));
}

// Pass deviceId to scope results to prospects pushed from that device only (used by /history).
// Omit it for the full index (used for duplicate detection across all devices).
export async function getAllProspects(deviceId?: string): Promise<ProspectRecord[]> {
  const indexKey = deviceId ? KEYS.prospectDeviceIndex(deviceId) : KEYS.prospectIndex;
  // Newest first (highest score = most recent contactedAt)
  const ids = await redis.zrange(indexKey, 0, -1, { rev: true });
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids as string[]) {
    pipeline.get(KEYS.prospect(id));
  }
  const results = await pipeline.exec();
  return (results as Array<ProspectRecord | null>).filter(
    (r): r is ProspectRecord => r !== null
  );
}

// ── LP visit tracking ──────────────────────────────────────────────────────

export async function appendLpVisit(slug: string, visitedAt: string): Promise<void> {
  const prospectId = await redis.get<string>(KEYS.lpToProspect(slug));
  if (!prospectId) return; // unrecognised slug — skip silently

  const record = await redis.get<ProspectRecord>(KEYS.prospect(prospectId));
  if (!record) return;

  record.lpVisits = [...record.lpVisits, visitedAt];
  await redis.set(KEYS.prospect(prospectId), record);
}

// ── Landing pages ──────────────────────────────────────────────────────────

export async function saveLp(slug: string, content: LandingPageContent): Promise<void> {
  await redis.set(KEYS.lp(slug), content);
}

export async function getLp(slug: string): Promise<LandingPageContent | null> {
  return redis.get<LandingPageContent>(KEYS.lp(slug));
}

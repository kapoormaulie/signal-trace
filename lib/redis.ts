import { Redis } from "@upstash/redis";
import crypto from "crypto";
import type { ProspectRecord, LandingPageContent } from "@/types";
import type { UserSettings } from "@/hooks/useSettings";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEYS = {
  prospect: (id: string) => `prospect:${id}`,
  prospectIndex: "prospects:index",          // sorted set: score=contactedAt ms, member=id — everything, used for duplicate detection
  prospectScopeIndex: (scopeId: string) => `prospects:index:${scopeId}`, // per-device OR per-account sorted set — used to scope the /history page
  lp: (slug: string) => `lp:${slug}`,
  lpToProspect: (slug: string) => `lp-to-prospect:${slug}`, // reverse index for visit tracking
  user: (id: string) => `user:${id}`,
  userEmailIndex: (email: string) => `user-email:${email}`,
  session: (token: string) => `session:${token}`,
  userSettings: (userId: string) => `user-settings:${userId}`,
} as const;

// ── Prospects ──────────────────────────────────────────────────────────────

export async function saveProspect(record: ProspectRecord): Promise<void> {
  const score = new Date(record.contactedAt).getTime();
  const ops: Promise<unknown>[] = [
    redis.set(KEYS.prospect(record.id), record),
    redis.zadd(KEYS.prospectIndex, { score, member: record.id }),
    redis.set(KEYS.lpToProspect(record.lpSlug), record.id),
  ];
  if (record.deviceId) {
    ops.push(redis.zadd(KEYS.prospectScopeIndex(record.deviceId), { score, member: record.id }));
  }
  if (record.userId) {
    ops.push(redis.zadd(KEYS.prospectScopeIndex(record.userId), { score, member: record.id }));
  }
  await Promise.all(ops);
}

export async function getProspect(id: string): Promise<ProspectRecord | null> {
  return redis.get<ProspectRecord>(KEYS.prospect(id));
}

// Pass scopeId (a deviceId or a userId) to scope results to prospects pushed under that
// scope only (used by /history). Omit it for the full index (used for duplicate detection).
export async function getAllProspects(scopeId?: string): Promise<ProspectRecord[]> {
  const indexKey = scopeId ? KEYS.prospectScopeIndex(scopeId) : KEYS.prospectIndex;
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

// ── Auth ───────────────────────────────────────────────────────────────────

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export async function createUser(email: string, passwordHash: string): Promise<StoredUser> {
  const id = crypto.randomUUID();
  const user: StoredUser = { id, email, passwordHash, createdAt: new Date().toISOString() };
  // Atomic uniqueness check — only claims the email if no user already has it.
  const claimed = await redis.set(KEYS.userEmailIndex(email), id, { nx: true });
  if (!claimed) throw new Error("EMAIL_TAKEN");
  await redis.set(KEYS.user(id), user);
  return user;
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const id = await redis.get<string>(KEYS.userEmailIndex(email));
  if (!id) return null;
  return redis.get<StoredUser>(KEYS.user(id));
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  return redis.get<StoredUser>(KEYS.user(id));
}

export async function saveSession(token: string, userId: string, ttlSeconds: number): Promise<void> {
  await redis.set(KEYS.session(token), userId, { ex: ttlSeconds });
}

export async function getSessionUserId(token: string): Promise<string | null> {
  return redis.get<string>(KEYS.session(token));
}

export async function deleteSession(token: string): Promise<void> {
  await redis.del(KEYS.session(token));
}

// ── Account-scoped settings ─────────────────────────────────────────────────

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  return redis.get<UserSettings>(KEYS.userSettings(userId));
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  await redis.set(KEYS.userSettings(userId), settings);
}

import { log } from "@/lib/logger";

const AIARK_BASE = "https://api.ai-ark.com/api/developer-portal/v1";

export interface AiArkFilters {
  industry?: string;
  size?: string;      // e.g. "1–10", "1000+"
  location?: string;
  funding?: string;   // e.g. "Seed", "Series A", "Public"
  keywords?: string;
}

export interface AiArkCompany {
  name: string;
  description: string;
  url: string;
}

// AI Ark's confirmed funding.type enum only lists these explicitly in their docs
// (plus "..." for more we don't have confirmed) — stick to what's verified rather
// than guess at unconfirmed enum values and risk a 400.
const FUNDING_TYPE_MAP: Record<string, string> = {
  "Pre-Seed": "PRE_SEED",
  Seed: "SEED",
  "Series A": "SERIES_A",
  "Series B": "SERIES_B",
  "Series C+": "VENTURE_ROUND", // broadest confirmed match for later-stage rounds
};

function parseSizeRange(size: string): { start: number; end: number } | null {
  if (!size) return null;
  if (size.endsWith("+")) {
    const start = parseInt(size, 10);
    if (Number.isNaN(start)) return null;
    return { start, end: 100_000_000 };
  }
  const [startStr, endStr] = size.split(/[–-]/);
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

function buildAccountFilters(filters: AiArkFilters): Record<string, unknown> {
  const account: Record<string, unknown> = {};

  if (filters.industry) {
    account.industries = { any: { include: { mode: "SMART", content: [filters.industry] } } };
  }
  if (filters.size) {
    const range = parseSizeRange(filters.size);
    if (range) account.employeeSize = { type: "RANGE", range: [range] };
  }
  if (filters.location && filters.location !== "Global") {
    account.location = { any: { include: [filters.location] } };
  }
  if (filters.keywords) {
    account.keyword = {
      any: {
        include: {
          sources: [{ mode: "SMART", source: "DESCRIPTION" }],
          content: [filters.keywords],
        },
      },
    };
  }
  if (filters.funding === "Public") {
    account.type = { any: { include: ["PUBLIC_COMPANY"] } };
  } else if (filters.funding && FUNDING_TYPE_MAP[filters.funding]) {
    account.funding = { type: [FUNDING_TYPE_MAP[filters.funding]] };
  }
  // "Bootstrapped" has no clean AI Ark equivalent — intentionally left unfiltered.

  return account;
}

export async function searchCompaniesAiArk(
  filters: AiArkFilters,
  count: number
): Promise<AiArkCompany[]> {
  const apiKey = process.env.AIARK_API_KEY;
  if (!apiKey) throw new Error("AIARK_API_KEY is not set");

  const body = {
    account: buildAccountFilters(filters),
    page: 0,
    size: Math.min(100, Math.max(1, count)),
  };

  const res = await fetch(`${AIARK_BASE}/companies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-TOKEN": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log(`AI Ark company search error ${res.status}: ${text.slice(0, 300)}`);
    throw new Error(`AI Ark API ${res.status}`);
  }

  const data = await res.json();
  const content: Array<{
    summary?: { name?: string; description?: string; overview?: string };
    link?: { website?: string; domain?: string };
  }> = data?.content ?? [];

  return content
    .map((c) => ({
      name: c.summary?.name?.trim() ?? "",
      description: c.summary?.description?.trim() || c.summary?.overview?.trim() || "",
      url: c.link?.website || c.link?.domain || "",
    }))
    .filter((c) => c.name.length > 1);
}

// AI Ark's person search doesn't return emails directly — export-single does, but only
// by AI-Ark ID (from a prior search) or LinkedIn URL. Same domain-guessing heuristic as
// lib/findymail.ts since the person search also needs a domain, not a free-text company name.
function guessDomain(company: string): string {
  if (company.includes(".")) return company.toLowerCase().trim();
  return `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
}

interface AiArkExportResponse {
  email?: { state?: string; output?: Array<{ address: string; status: string }> };
}

async function exportPersonEmail(apiKey: string, body: { id?: string; url?: string }): Promise<string | null> {
  const res = await fetch(`${AIARK_BASE}/people/export/single`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-TOKEN": apiKey },
    body: JSON.stringify(body),
  });
  if (res.status === 404) return null; // no email found — not an error, per their docs
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log(`AI Ark export error ${res.status}: ${text.slice(0, 300)}`);
    return null;
  }
  const data: AiArkExportResponse = await res.json();
  const output = data.email?.output ?? [];
  const valid = output.find((o) => o.status === "VALID") ?? output[0];
  return valid?.address ?? null;
}

export async function findEmailViaAiArk(
  fullName: string,
  company: string,
  linkedinUrl?: string
): Promise<string | null> {
  const apiKey = process.env.AIARK_API_KEY;
  if (!apiKey || !fullName.trim() || !company.trim()) return null;

  try {
    // LinkedIn URL lets us skip straight to export — one call instead of search-then-export.
    if (linkedinUrl) {
      return await exportPersonEmail(apiKey, { url: linkedinUrl });
    }

    const searchRes = await fetch(`${AIARK_BASE}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-TOKEN": apiKey },
      body: JSON.stringify({
        contact: { fullName: { any: { include: { mode: "SMART", content: [fullName] } } } },
        account: { domain: { any: { include: [guessDomain(company)] } } },
        page: 0,
        size: 1,
      }),
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const id: string | undefined = searchData?.content?.[0]?.id;
    if (!id) return null;

    return await exportPersonEmail(apiKey, { id });
  } catch (err) {
    log(`AI Ark person lookup error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

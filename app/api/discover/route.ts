import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";
import { searchCompaniesAiArk } from "@/lib/aiark";
import { searchLookalikesOcean } from "@/lib/ocean";
import { log } from "@/lib/logger";

const exa = new Exa(process.env.EXA_API_KEY!);

function parseCompanyName(title: string): string {
  // "Stripe | Financial Infrastructure" → "Stripe"
  // "About Acme Corp - Home" → "Acme Corp"
  return title
    .split(/\s*[\|–—\-:]\s*/)[0]
    .replace(/^(about|home|welcome to)\s+/i, "")
    .trim();
}

function buildFilterQuery(filters: Record<string, string>): string {
  const parts: string[] = [];
  if (filters.industry) parts.push(filters.industry);
  if (filters.size) parts.push(`${filters.size} employees`);
  if (filters.location) parts.push(filters.location);
  if (filters.funding) parts.push(filters.funding);
  if (filters.keywords) parts.push(filters.keywords);
  return `B2B company ${parts.join(" ")} startup technology`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mode: "icp" | "filters" = body?.mode ?? "icp";
  const requestedCount = Number(body?.count ?? 20);
  const numResults = Math.min(100, Math.max(1, Number.isFinite(requestedCount) ? requestedCount : 20));
  const exclude = new Set(
    (Array.isArray(body?.exclude) ? body.exclude : [])
      .map((n: unknown) => String(n).trim().toLowerCase())
      .filter(Boolean)
  );
  // Over-fetch so that after filtering out already-added companies we can still return
  // up to numResults fresh ones (Exa's ceiling is 100 either way).
  const fetchCount = Math.min(100, numResults + exclude.size);

  // Seed domains given → this is explicitly a lookalike search, Ocean.io's specialty.
  // Takes priority over AI Ark since it's the more specific signal of user intent.
  if (mode === "filters" && process.env.OCEAN_API_KEY) {
    const filters = body?.filters ?? {};
    const seedDomains: string[] = String(filters.lookalikeDomains ?? "")
      .split(",")
      .map((d: string) => d.trim())
      .filter(Boolean);
    if (seedDomains.length > 0) {
      try {
        const raw = await searchLookalikesOcean(seedDomains, filters, fetchCount);
        const companies = raw
          .filter((c) => !exclude.has(c.name.trim().toLowerCase()))
          .slice(0, numResults);
        log(`discover | Ocean.io lookalike mode | found ${companies.length} companies (excluded ${exclude.size} already-added)`);
        return NextResponse.json({ companies, source: "ocean" });
      } catch (err) {
        log(`discover | Ocean.io error, falling back: ${err instanceof Error ? err.message : String(err)}`);
        // fall through to AI Ark / Exa below
      }
    }
  }

  // Filter mode with AI Ark configured gets real structured filtering against their
  // verified company database instead of faking it as a fuzzy Exa web-search string.
  if (mode === "filters" && process.env.AIARK_API_KEY) {
    const filters = body?.filters ?? {};
    try {
      const raw = await searchCompaniesAiArk(filters, fetchCount);
      const companies = raw
        .filter((c) => !exclude.has(c.name.trim().toLowerCase()))
        .slice(0, numResults);
      log(`discover | AI Ark filter mode | found ${companies.length} companies (excluded ${exclude.size} already-added)`);
      return NextResponse.json({ companies, source: "aiark" });
    } catch (err) {
      log(`discover | AI Ark error, falling back to Exa: ${err instanceof Error ? err.message : String(err)}`);
      // fall through to the Exa path below
    }
  }

  let query = "";
  if (mode === "icp") {
    const description: string = body?.description?.trim() ?? "";
    if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });
    query = `companies that ${description}`;
    log(`discover | icp mode | query="${query}"`);
  } else {
    query = buildFilterQuery(body?.filters ?? {});
    log(`discover | filter mode | query="${query}"`);
  }

  try {
    const response = await exa.searchAndContents(query, {
      numResults: fetchCount,
      type: "neural",
      category: "company",
      summary: { query: "What does this company do and who are their customers?" },
    });

    const companies = response.results
      .filter((r) => r.title && r.summary)
      .map((r) => ({
        name: parseCompanyName(r.title ?? ""),
        description: r.summary as string,
        url: r.url,
      }))
      .filter((c) => c.name.length > 1 && c.name.split(" ").length <= 5)
      .filter((c) => !exclude.has(c.name.trim().toLowerCase()))
      .slice(0, numResults);

    log(`discover | found ${companies.length} companies (excluded ${exclude.size} already-added)`);
    return NextResponse.json({ companies, source: "exa" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`discover | error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

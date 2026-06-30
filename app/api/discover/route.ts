import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";
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
      numResults: 20,
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
      .filter((c) => c.name.length > 1 && c.name.split(" ").length <= 5);

    log(`discover | found ${companies.length} companies`);
    return NextResponse.json({ companies });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`discover | error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { log } from "@/lib/logger";

const OCEAN_URL = "https://api.ocean.io/v3/search/companies";

export interface OceanFilters {
  industry?: string;
  size?: string;      // e.g. "1–10", "1000+"
  location?: string;
}

export interface OceanCompany {
  name: string;
  description: string;
  url: string;
}

// SignalTrace's size buckets don't line up 1:1 with Ocean's enum — map to the
// closest bucket(s). "1000+" expands to every Ocean bucket above 1000 since
// Ocean has no open-ended top bucket that matches it alone.
const SIZE_MAP: Record<string, string[]> = {
  "1–10": ["2-10"],
  "11–50": ["11-50"],
  "51–200": ["51-200"],
  "201–500": ["201-500"],
  "501–1000": ["501-1000"],
  "1000+": ["1001-5000", "5001-10000", "10001-50000", "50001-100000", "100001-500000", "500000+"],
};

// Only countries we have a confirmed ISO code for — "Europe" has no single
// confirmed Ocean region filter in the docs, so it's intentionally left unfiltered
// rather than guessing a list of country codes.
const COUNTRY_MAP: Record<string, string> = {
  "United States": "us",
  "United Kingdom": "gb",
  India: "in",
  Canada: "ca",
  Australia: "au",
};

export async function searchLookalikesOcean(
  seedDomains: string[],
  filters: OceanFilters,
  count: number
): Promise<OceanCompany[]> {
  const apiKey = process.env.OCEAN_API_KEY;
  if (!apiKey) throw new Error("OCEAN_API_KEY is not set");

  const companiesFilters: Record<string, unknown> = {};
  if (seedDomains.length > 0) companiesFilters.lookalikeDomains = seedDomains.slice(0, 5);
  if (filters.industry) companiesFilters.industries = { industries: [filters.industry] };
  if (filters.size && SIZE_MAP[filters.size]) companiesFilters.companySizes = SIZE_MAP[filters.size];
  if (filters.location && COUNTRY_MAP[filters.location]) {
    companiesFilters.primaryLocations = { includeCountries: [COUNTRY_MAP[filters.location]] };
  }

  const res = await fetch(OCEAN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Token": apiKey },
    body: JSON.stringify({ companiesFilters, size: Math.min(100, Math.max(1, count)) }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log(`Ocean.io company search error ${res.status}: ${text.slice(0, 300)}`);
    throw new Error(`Ocean.io API ${res.status}`);
  }

  const data = await res.json();
  // Each result is wrapped as { company: {...}, relevance } — not flat, despite what
  // Ocean's own docs example shows (confirmed against the live API response).
  const results: Array<{
    company?: {
      domain?: string;
      name?: string;
      description?: string;
      industries?: string[];
      technologies?: string[];
    };
  }> = data?.companies ?? [];

  return results
    .map((r) => {
      const c = r.company ?? {};
      const shortDescription =
        c.description?.trim().slice(0, 280) ||
        [
          c.industries?.length ? c.industries.slice(0, 3).join(", ") : "",
          c.technologies?.length ? `uses ${c.technologies.slice(0, 3).join(", ")}` : "",
        ].filter(Boolean).join(" · ");
      return {
        name: c.name?.trim() ?? "",
        description: shortDescription,
        url: c.domain ? `https://${c.domain}` : "",
      };
    })
    .filter((c) => c.name.length > 1);
}

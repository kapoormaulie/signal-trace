import { log } from "./logger";

interface ClayEnrichmentResult {
  email?: string;
  emails?: Array<{ email: string; verified?: boolean }>;
  confidence?: number;
}

/**
 * Find email via Clay API
 * Clay is synchronous and returns immediate results
 */
export async function enrichEmailWithClay(
  firstName: string,
  lastName: string,
  companyName: string
): Promise<{ email: string; confidence: number } | null> {
  if (!process.env.CLAY_API_KEY) {
    return null;
  }

  try {
    log(`clay-enrich | trying Clay for ${firstName} ${lastName} at ${companyName}`);

    const response = await fetch("https://api.claydotai.com/v1/enrichment/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CLAY_API_KEY}`,
      },
      body: JSON.stringify({
        enrichment_type: "Person",
        inputs: [
          {
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
          },
        ],
      }),
    });

    log(`clay-enrich | response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      log(`clay-enrich | error ${response.status}: ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{
        enriched_data?: ClayEnrichmentResult;
      }>;
    };

    if (data.results && data.results.length > 0) {
      const enriched = data.results[0].enriched_data;
      if (enriched?.email) {
        log(`clay-enrich | ✓ found: ${enriched.email}`);
        return {
          email: enriched.email,
          confidence: Math.round((enriched.confidence || 85) * 100) / 100,
        };
      } else if (enriched?.emails && enriched.emails.length > 0) {
        const verified = enriched.emails.find((e) => e.verified);
        const best = verified || enriched.emails[0];
        if (best?.email) {
          log(`clay-enrich | ✓ found: ${best.email}`);
          return {
            email: best.email,
            confidence: verified ? 90 : 80,
          };
        }
      }
    }

    log(`clay-enrich | ✗ no email found`);
    return null;
  } catch (err) {
    log(`clay-enrich | error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

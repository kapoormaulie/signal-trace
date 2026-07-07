import { log } from "./logger";

interface ContactInput {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

/**
 * Request bulk enrichment from FullEnrich.
 * Results will be delivered to the webhook endpoint.
 * Use checkEnrichedEmail() to poll for results.
 */
export async function requestFullEnrichBulk(
  contacts: ContactInput[],
  webhookUrl: string
): Promise<string | null> {
  if (!process.env.FULLENRICH_API_KEY) {
    log("fullenrich-request | FULLENRICH_API_KEY not set");
    return null;
  }

  if (contacts.length === 0) return null;

  try {
    log(`fullenrich-request | requesting enrichment for ${contacts.length} contacts`);

    const response = await fetch("https://app.fullenrich.com/api/v2/contact/enrich/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FULLENRICH_API_KEY}`,
      },
      body: JSON.stringify({
        name: `SignalTrace-${Date.now()}`,
        webhook_url: webhookUrl,
        data: contacts.map((c) => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          company_name: c.company_name,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      log(`fullenrich-request | error ${response.status}: ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as { enrichment_id?: string };
    if (data.enrichment_id) {
      log(`fullenrich-request | ✓ submitted batch ${data.enrichment_id}`);
      return data.enrichment_id;
    }

    return null;
  } catch (err) {
    log(`fullenrich-request | error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Check if a person's email has been enriched and cached.
 * Returns the email if available, null otherwise.
 */
export async function checkEnrichedEmail(personId: string): Promise<{
  email: string;
  source: "fullenrich";
  confidence: number;
  verified: boolean;
} | null> {
  try {
    const { redis } = await import("./redis");
    const result = await redis.get(`fullenrich:person:${personId}`);
    if (result) {
      log(`fullenrich-check | ✓ found cached email for ${personId}`);
      return result as any;
    }
    return null;
  } catch (err) {
    return null;
  }
}

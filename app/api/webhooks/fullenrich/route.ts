import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { log } from "@/lib/logger";

interface EnrichmentResult {
  id: string;
  full_name?: string;
  emails?: Array<{
    email: string;
    type: "work" | "personal";
  }>;
  phones?: Array<{
    phone: string;
    type: string;
  }>;
}

interface FullEnrichWebhookPayload {
  enrichment_id: string;
  data: EnrichmentResult[];
  status: "completed" | "failed";
}

export async function POST(req: NextRequest) {
  try {
    const payload: FullEnrichWebhookPayload = await req.json();
    log(`fullenrich-webhook | received enrichment ${payload.enrichment_id} with ${payload.data.length} contacts`);

    if (payload.status === "completed" && payload.data) {
      // Store enrichment results in Redis for quick lookups
      for (const result of payload.data) {
        if (result.emails && result.emails.length > 0) {
          const workEmail = result.emails.find((e) => e.type === "work")?.email;
          const email = workEmail || result.emails[0].email;

          // Key: fullenrich:person:{id} -> {email, timestamp}
          await redis.set(`fullenrich:person:${result.id}`, {
            email,
            source: "fullenrich",
            confidence: 95,
            verified: true,
            enrichedAt: new Date().toISOString(),
          });

          log(`fullenrich-webhook | ✓ cached email for ${result.full_name}: ${email}`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`fullenrich-webhook | error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

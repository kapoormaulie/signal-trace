import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company, linkedinUrl } = await req.json();

    if (!firstName?.trim() || !lastName?.trim() || !company?.trim()) {
      return NextResponse.json(
        { error: "firstName, lastName, company are required" },
        { status: 400 }
      );
    }

    log(`Email enrichment: ${firstName} ${lastName} at ${company}`);

    // Multi-source email enrichment pipeline
    const emailSources: Array<{
      email: string;
      source: "fullenrich" | "aiark" | "hunter" | "apollo" | "web";
      confidence: number;
      verified: boolean;
    }> = [];

    // 1. FullEnrich (highest confidence if available)
    if (process.env.FULLENRICH_API_KEY) {
      try {
        const response = await fetch("https://api.fullenrich.com/v1/person/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.FULLENRICH_API_KEY}`,
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            company_name: company,
            linkedin_url: linkedinUrl,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            data?: {
              email?: string;
              emails?: Array<{ email: string; confidence: number }>;
            };
          };

          if (data.data?.email) {
            emailSources.push({
              email: data.data.email,
              source: "fullenrich",
              confidence: 95,
              verified: true,
            });
          } else if (data.data?.emails && data.data.emails.length > 0) {
            const best = data.data.emails.sort((a, b) => b.confidence - a.confidence)[0];
            if (best) {
              emailSources.push({
                email: best.email,
                source: "fullenrich",
                confidence: Math.round(best.confidence * 100),
                verified: true,
              });
            }
          }
        }
      } catch (err) {
        log(`FullEnrich error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. AI Ark API
    if (process.env.AIARK_API_KEY && emailSources.length === 0) {
      try {
        const response = await fetch("https://api.aiark.com/v1/person", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.AIARK_API_KEY,
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            company: company,
            linkedin_profile_url: linkedinUrl,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            email?: string;
            emails?: Array<{ email: string; confidence?: number }>;
          };

          if (data.email) {
            emailSources.push({
              email: data.email,
              source: "aiark",
              confidence: 92,
              verified: true,
            });
          } else if (data.emails && data.emails.length > 0) {
            const best = data.emails.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
            if (best) {
              emailSources.push({
                email: best.email,
                source: "aiark",
                confidence: Math.round((best.confidence || 0.9) * 100),
                verified: true,
              });
            }
          }
        }
      } catch (err) {
        log(`AI Ark error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. Hunter.io API
    if (process.env.HUNTER_API_KEY && emailSources.length === 0) {
      try {
        const domain = company.toLowerCase().replace(/\s+/g, "").concat(".com");
        const response = await fetch(
          `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${process.env.HUNTER_API_KEY}`
        );

        if (response.ok) {
          const data = (await response.json()) as {
            data?: { email?: string; confidence?: number };
          };

          if (data.data?.email) {
            emailSources.push({
              email: data.data.email,
              source: "hunter",
              confidence: (data.data.confidence || 0.8) * 100,
              verified: (data.data.confidence || 0.8) > 0.8,
            });
          }
        }
      } catch (err) {
        log(`Hunter.io error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 5. Apollo.io verification (if email already found)
    if (process.env.APOLLO_API_KEY && emailSources.length > 0) {
      try {
        const response = await fetch("https://api.apollo.io/v1/contacts/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.APOLLO_API_KEY,
          },
          body: JSON.stringify({
            q_organization_name: company,
            q_person_first_name: firstName,
            q_person_last_name: lastName,
            limit: 1,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            contacts?: Array<{ email?: string }>;
          };

          if (data.contacts?.[0]?.email) {
            const apolloEmail = data.contacts[0].email;
            // Verify if Apollo has same email
            if (emailSources[0].email === apolloEmail) {
              emailSources[0].confidence = Math.min(100, emailSources[0].confidence + 10);
            } else {
              emailSources.push({
                email: apolloEmail,
                source: "apollo",
                confidence: 80,
                verified: true,
              });
            }
          }
        }
      } catch (err) {
        log(`Apollo verification error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Sort by confidence
    emailSources.sort((a, b) => b.confidence - a.confidence);

    if (emailSources.length === 0) {
      log(`No email found for ${firstName} ${lastName} at ${company}`);
      return NextResponse.json(
        {
          email: null,
          alternatives: [],
          confidence: 0,
          message: "No email found from any source",
        }
      );
    }

    log(
      `Email enriched: ${emailSources[0].email} (${emailSources[0].source}, ${emailSources[0].confidence}% confidence)`
    );

    return NextResponse.json({
      email: emailSources[0].email,
      source: emailSources[0].source,
      confidence: emailSources[0].confidence,
      verified: emailSources[0].verified,
      alternatives: emailSources.slice(1).map((s) => ({
        email: s.email,
        source: s.source,
        confidence: s.confidence,
        verified: s.verified,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Email enrichment error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

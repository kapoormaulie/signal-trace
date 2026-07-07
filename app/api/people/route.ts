import { NextRequest, NextResponse } from "next/server";
import { fetchPeopleAtCompany, findPersonEmail } from "@/lib/exa";
import { matchPersonInApollo } from "@/lib/apollo";
import { findEmailViaHunter } from "@/lib/hunter";
import { checkEnrichedEmail, requestFullEnrichBulk } from "@/lib/fullenrich";
import { log } from "@/lib/logger";

interface EmailResult {
  email: string;
  source: "fullenrich" | "aiark" | "hunter" | "apollo" | "exa" | "unknown";
  confidence: number;
  verified: boolean;
}

// Verify email domain matches company
function isValidCompanyEmail(email: string, company: string): boolean {
  if (!email || !company) return false;

  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!emailDomain) return false;

  // Extract company domain variants
  const companyClean = company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

  const variants = [
    companyClean.replace(/\s+/g, ""), // "google"
    companyClean.split(" ")[0], // "google" from "google cloud"
    company.toLowerCase().replace(/\s+/g, "-"), // "google-cloud"
  ];

  // Check if email domain contains company name
  const isMatch = variants.some((v) => emailDomain.includes(v));

  // Block suspicious domains
  const blocklist = [
    "example.com",
    "test.com",
    "mail.com",
    "domain.com",
    "company.com",
    "business.com",
    "email.com",
    "corporate.com",
    "temp.com",
    "temp-mail.com",
    "maildrop.com",
    "mailinator.com",
    "10minutemail.com",
  ];

  const isBlocked = blocklist.includes(emailDomain);

  // Require match (or be known-good source like apollo)
  return isMatch && !isBlocked;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const company: string = body?.company?.trim() ?? "";

  if (!company) {
    return NextResponse.json({ error: "company is required" }, { status: 400 });
  }

  log(`people-lookup | company="${company}"`);

  try {
    const people = await fetchPeopleAtCompany(company);
    log(`people-lookup | found ${people.length} people at ${company}`);

    // Enrich all people with emails in parallel (Multi-source with confidence scoring)
    // Collect people needing enrichment for async FullEnrich request
    const enrichmentQueue: Array<{ id: string; firstName: string; lastName: string }> = [];

    const enriched = await Promise.all(
      people.map(async (person) => {
        const [firstName, ...rest] = person.name.trim().split(" ");
        const lastName = rest.join(" ") || "-";

        let emailResult: EmailResult | null = null;
        const emailSources: EmailResult[] = [];

        log(`people-lookup | enriching ${person.name}: FullEnrich=${!!process.env.FULLENRICH_API_KEY} AiArk=${!!process.env.AIARK_API_KEY} Hunter=${!!process.env.HUNTER_API_KEY} Apollo=${!!process.env.APOLLO_API_KEY}`);

        // PRIORITY 0: Check FullEnrich cached results (from webhook)
        if (process.env.FULLENRICH_API_KEY) {
          const cached = await checkEnrichedEmail(person.id || "");
          if (cached) {
            emailResult = {
              email: cached.email,
              source: "fullenrich",
              confidence: cached.confidence,
              verified: cached.verified,
            };
            emailSources.push(emailResult);
            log(`people-lookup | ✓ FullEnrich cached: ${cached.email}`);
          }
        }

        // PRIORITY 1: Hunter.io (synchronous, 85% confidence)
        if (!emailResult) {
          log(`people-lookup | trying Hunter for ${person.name}...`);
          const hunterEmail = await findEmailViaHunter(firstName, lastName, company).catch((err) => {
            log(`people-lookup | Hunter error: ${err instanceof Error ? err.message : String(err)}`);
            return null;
          });
          if (hunterEmail) {
            emailResult = {
              email: hunterEmail,
              source: "hunter",
              confidence: 85,
              verified: true,
            };
            emailSources.push(emailResult);
            log(`people-lookup | ✓ Hunter found: ${hunterEmail}`);
          } else {
            log(`people-lookup | ✗ Hunter no result`);
          }
        }

        // PRIORITY 2: FullEnrich (most accurate if available)
        if (process.env.FULLENRICH_API_KEY) {
          log(`people-lookup | trying FullEnrich for ${person.name}...`);
          try {
            const response = await fetch("https://app.fullenrich.com/api/v2/people/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.FULLENRICH_API_KEY}`,
              },
              body: JSON.stringify({
                people: [{
                  first_name: firstName,
                  last_name: lastName,
                }],
                company_filters: {
                  names: [company],
                },
              }),
            });

            log(`people-lookup | FullEnrich response status: ${response.status}`);

            if (response.ok) {
              const data = (await response.json()) as {
                people?: Array<{
                  email?: string;
                  emails?: Array<{ email: string; confidence?: number }>;
                }>;
              };

              if (data.people && data.people.length > 0) {
                const match = data.people[0];
                if (match?.email) {
                  emailResult = {
                    email: match.email,
                    source: "fullenrich",
                    confidence: 95,
                    verified: true,
                  };
                  emailSources.push(emailResult);
                } else if (match?.emails && match.emails.length > 0) {
                  const best = match.emails.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
                  if (best) {
                    emailResult = {
                      email: best.email,
                      source: "fullenrich",
                      confidence: Math.round((best.confidence || 0.95) * 100),
                      verified: true,
                    };
                    emailSources.push(emailResult);
                  }
                }
              } else {
                log(`people-lookup | FullEnrich returned 200 but no people found`);
              }
            } else {
              const errorText = await response.text().catch(() => "");
              log(`people-lookup | FullEnrich error ${response.status}: ${errorText.slice(0, 200)}`);
            }
          } catch (err) {
            log(`people-lookup | FullEnrich error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        if (emailResult) {
          log(`people-lookup | ✓ FullEnrich found: ${emailResult.email}`);
        }

        // PRIORITY 3: AI Ark
        if (!emailResult && process.env.AIARK_API_KEY) {
          log(`people-lookup | trying AI Ark for ${person.name}...`);
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
                linkedin_profile_url: person.linkedinUrl,
              }),
            });

            log(`people-lookup | AI Ark response status: ${response.status}`);

            if (response.ok) {
              const data = (await response.json()) as {
                email?: string;
                emails?: Array<{ email: string; confidence?: number }>;
              };

              if (data.email) {
                emailResult = {
                  email: data.email,
                  source: "aiark",
                  confidence: 92,
                  verified: true,
                };
                emailSources.push(emailResult);
              } else if (data.emails && data.emails.length > 0) {
                const best = data.emails.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
                if (best) {
                  emailResult = {
                    email: best.email,
                    source: "aiark",
                    confidence: Math.round((best.confidence || 0.9) * 100),
                    verified: true,
                  };
                  emailSources.push(emailResult);
                }
              } else {
                log(`people-lookup | AI Ark returned 200 but no email found`);
              }
            } else {
              const errorText = await response.text().catch(() => "");
              log(`people-lookup | AI Ark error ${response.status}: ${errorText.slice(0, 200)}`);
            }
          } catch (err) {
            log(`people-lookup | AI Ark error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        if (emailResult) {
          log(`people-lookup | ✓ AI Ark found: ${emailResult.email}`);
        }

        // PRIORITY 4: Hunter.io
        if (!emailResult) {
          log(`people-lookup | trying Hunter for ${person.name}...`);
          const hunterEmail = await findEmailViaHunter(firstName, lastName, company).catch((err) => {
            log(`people-lookup | Hunter error: ${err instanceof Error ? err.message : String(err)}`);
            return null;
          });
          if (hunterEmail) {
            emailResult = {
              email: hunterEmail,
              source: "hunter",
              confidence: 85,
              verified: true,
            };
            emailSources.push(emailResult);
            log(`people-lookup | ✓ Hunter found: ${hunterEmail}`);
          } else {
            log(`people-lookup | ✗ Hunter no result`);
          }
        }

        // PRIORITY 5: Exa web search
        if (!emailResult) {
          log(`people-lookup | trying Exa for ${person.name}...`);
          const exaEmail = await findPersonEmail(firstName, lastName, company, person.linkedinUrl).catch((err) => {
            log(`people-lookup | Exa error: ${err instanceof Error ? err.message : String(err)}`);
            return null;
          });
          if (exaEmail) {
            emailResult = {
              email: exaEmail,
              source: "exa",
              confidence: 65,
              verified: false,
            };
            emailSources.push(emailResult);
            log(`people-lookup | ✓ Exa found: ${exaEmail}`);
          } else {
            log(`people-lookup | ✗ Exa no result`);
          }
        }

        // PRIORITY 6: Apollo match
        if (!emailResult) {
          log(`people-lookup | trying Apollo for ${person.name}...`);
          const apolloMatch = await matchPersonInApollo(firstName, lastName, company, person.linkedinUrl).catch((err) => {
            log(`people-lookup | Apollo error: ${err instanceof Error ? err.message : String(err)}`);
            return null;
          });
          if (apolloMatch?.email) {
            emailResult = {
              email: apolloMatch.email,
              source: "apollo",
              confidence: 80,
              verified: true,
            };
            emailSources.push(emailResult);
            log(`people-lookup | ✓ Apollo found: ${apolloMatch.email}`);
          } else {
            log(`people-lookup | ✗ Apollo no result`);
          }
        }

        // Validate email matches company domain (but trust verified sources)
        if (emailResult) {
          const isValid = isValidCompanyEmail(emailResult.email, company);
          const isVerifiedSource = ["fullenrich", "aiark", "hunter", "apollo"].includes(emailResult.source);

          if (!isValid && !isVerifiedSource) {
            // Unverified source + domain mismatch = reject
            log(`people-lookup | ⚠️ REJECTED email for ${person.name}: ${emailResult.email} (unverified source + domain mismatch)`);
            emailResult = null;
          } else if (!isValid && isVerifiedSource) {
            // Verified source + domain mismatch = log warning but keep it
            log(`people-lookup | ⚠️ WARNING: email domain mismatch but keeping ${emailResult.email} from verified source (${emailResult.source})`);
          }
        }

        if (emailResult) {
          log(`people-lookup | ✓ email found for ${person.name}: ${emailResult.email} (${emailResult.source}, ${emailResult.confidence}% confidence, verified: ${emailResult.verified})`);
        } else {
          log(`people-lookup | ✗ no valid email for ${person.name} — queued for FullEnrich enrichment`);
          // Queue for async enrichment if FullEnrich is available
          if (process.env.FULLENRICH_API_KEY) {
            enrichmentQueue.push({
              id: person.id || `${person.name}-${company}`,
              firstName,
              lastName,
            });
          }
        }

        return {
          ...person,
          email: emailResult?.email,
          emailSource: emailResult?.source,
          emailConfidence: emailResult?.confidence || 0,
          emailVerified: emailResult?.verified || false,
        };
      })
    );

    // Submit batch enrichment request to FullEnrich in background (don't wait)
    if (enrichmentQueue.length > 0) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/fullenrich`;
      requestFullEnrichBulk(
        enrichmentQueue.map((item) => ({
          id: item.id,
          first_name: item.firstName,
          last_name: item.lastName,
          company_name: company,
        })),
        webhookUrl
      ).catch((err) => {
        log(`people-lookup | FullEnrich batch request error: ${err instanceof Error ? err.message : String(err)}`);
      });
    }

    return NextResponse.json({ people: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`people-lookup | error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

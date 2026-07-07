import { NextRequest, NextResponse } from "next/server";
import { fetchPeopleAtCompany, findPersonEmail } from "@/lib/exa";
import { matchPersonInApollo } from "@/lib/apollo";
import { findEmailViaHunter } from "@/lib/hunter";
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
    const enriched = await Promise.all(
      people.map(async (person) => {
        const [firstName, ...rest] = person.name.trim().split(" ");
        const lastName = rest.join(" ") || "-";

        let emailResult: EmailResult | null = null;
        const emailSources: EmailResult[] = [];

        // PRIORITY 1: FullEnrich (most accurate if available)
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
                linkedin_url: person.linkedinUrl,
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
                emailResult = {
                  email: data.data.email,
                  source: "fullenrich",
                  confidence: 95,
                  verified: true,
                };
                emailSources.push(emailResult);
              } else if (data.data?.emails && data.data.emails.length > 0) {
                const best = data.data.emails.sort((a, b) => b.confidence - a.confidence)[0];
                if (best) {
                  emailResult = {
                    email: best.email,
                    source: "fullenrich",
                    confidence: Math.round(best.confidence * 100),
                    verified: true,
                  };
                  emailSources.push(emailResult);
                }
              }
            }
          } catch (err) {
            // Continue to next source
          }
        }

        // PRIORITY 2: AI Ark
        if (!emailResult && process.env.AIARK_API_KEY) {
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
              }
            }
          } catch (err) {
            // Continue to next source
          }
        }

        // PRIORITY 3: Hunter.io
        if (!emailResult) {
          const hunterEmail = await findEmailViaHunter(firstName, lastName, company).catch(() => null);
          if (hunterEmail) {
            emailResult = {
              email: hunterEmail,
              source: "hunter",
              confidence: 85,
              verified: true,
            };
            emailSources.push(emailResult);
          }
        }

        // PRIORITY 4: Exa web search
        if (!emailResult) {
          const exaEmail = await findPersonEmail(firstName, lastName, company, person.linkedinUrl).catch(() => null);
          if (exaEmail) {
            emailResult = {
              email: exaEmail,
              source: "exa",
              confidence: 65,
              verified: false,
            };
            emailSources.push(emailResult);
          }
        }

        // PRIORITY 5: Apollo match
        if (!emailResult) {
          const apolloMatch = await matchPersonInApollo(firstName, lastName, company, person.linkedinUrl).catch(() => null);
          if (apolloMatch?.email) {
            emailResult = {
              email: apolloMatch.email,
              source: "apollo",
              confidence: 80,
              verified: true,
            };
            emailSources.push(emailResult);
          }
        }

        // Validate email matches company domain
        if (emailResult && !isValidCompanyEmail(emailResult.email, company)) {
          log(`people-lookup | ⚠️ REJECTED email for ${person.name}: ${emailResult.email} (domain mismatch - doesn't match ${company})`);
          emailResult = null; // Discard wrong email
        }

        if (emailResult) {
          log(`people-lookup | ✓ email found for ${person.name}: ${emailResult.email} (${emailResult.source}, ${emailResult.confidence}% confidence, verified: ${emailResult.verified})`);
        } else {
          log(`people-lookup | ✗ no valid email for ${person.name}`);
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

    return NextResponse.json({ people: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`people-lookup | error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

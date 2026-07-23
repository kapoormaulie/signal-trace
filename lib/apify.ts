import { verifyEmailViaHunter } from "@/lib/hunter";
import { log } from "@/lib/logger";

const APIFY_URL = "https://api.apify.com/v2/acts/automation-lab~email-finder/run-sync-get-dataset-items";

// Same domain-guessing heuristic as lib/findymail.ts / lib/aiark.ts — this actor
// needs an actual domain, not a free-text company name.
function guessDomain(company: string): string {
  if (company.includes(".")) return company.toLowerCase().trim();
  return `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
}

interface ApifyResult {
  email?: string;
  confidence?: "high" | "medium" | "low";
  sources?: string[];
}

export interface ApifyEmailMatch {
  email: string;
  verified: boolean;
}

// This actor mixes real signal (website-scraped emails: "high") with pure
// pattern-generation ("low" — flast@, first.last@, etc. with zero verification,
// exactly the kind of confident-looking guess this app has spent a lot of effort
// eliminating). "low" is rejected outright rather than returned as a find.
// "medium" (Gravatar/GitHub-corroborated, still not a direct source hit) gets an
// independent Hunter deliverability check before being trusted at all.
export async function findEmailViaApify(
  firstName: string,
  lastName: string,
  company: string
): Promise<ApifyEmailMatch | null> {
  const key = process.env.APIFY_API_KEY;
  if (!key || !firstName.trim() || !lastName.trim() || !company.trim()) return null;

  try {
    const res = await fetch(`${APIFY_URL}?token=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        people: [{ firstName, lastName, domain: guessDomain(company), company }],
        checkWebsite: true,
        checkGitHub: true,
        checkGravatar: true,
      }),
    });
    if (!res.ok) {
      log(`Apify email finder error ${res.status}`);
      return null;
    }

    const data: ApifyResult[] = await res.json();
    const result = data[0];
    if (!result?.email) return null;

    if (result.confidence === "low") return null; // pure pattern guess, no verification signal at all

    if (result.confidence === "high") {
      return { email: result.email, verified: true };
    }

    // "medium" — corroborated but not source-confirmed; independently verify.
    const hunterCheck = await verifyEmailViaHunter(result.email).catch(() => null);
    if (hunterCheck === false) return null;
    return { email: result.email, verified: hunterCheck === true };
  } catch (err) {
    log(`Apify email finder error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

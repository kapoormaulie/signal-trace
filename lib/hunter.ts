const HUNTER_BASE = "https://api.hunter.io/v2";

// Free tier: 25 searches + 50 verifications/month, no credit card required.
function getKey(): string | null {
  return process.env.HUNTER_API_KEY || null;
}

// Drop-in alongside findPersonEmail (Exa) / matchPersonInApollo — same "email or null" shape.
// Returns null silently if HUNTER_API_KEY isn't set, so this stays fully optional.
export async function findEmailViaHunter(
  firstName: string,
  lastName: string,
  company: string
): Promise<string | null> {
  const key = getKey();
  if (!key || !firstName || !lastName || !company) return null;

  try {
    const url = `${HUNTER_BASE}/email-finder?${new URLSearchParams({
      company,
      first_name: firstName,
      last_name: lastName,
      api_key: key,
    })}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const email: string | undefined = data?.data?.email;
    const score: number = data?.data?.score ?? 0;
    // Hunter returns low-confidence guesses too — only trust ones it's reasonably sure about.
    if (!email || score < 50) return null;
    return email;
  } catch {
    return null;
  }
}

export async function verifyEmailViaHunter(email: string): Promise<boolean | null> {
  const key = getKey();
  if (!key || !email) return null;

  try {
    const url = `${HUNTER_BASE}/email-verifier?${new URLSearchParams({ email, api_key: key })}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const status: string | undefined = data?.data?.status;
    if (!status) return null;
    return status === "valid" || status === "accept_all";
  } catch {
    return null;
  }
}

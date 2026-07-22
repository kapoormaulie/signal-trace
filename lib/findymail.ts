const FINDYMAIL_BASE = "https://app.findymail.com/api";

function getKey(): string | null {
  return process.env.FINDYMAIL_API_KEY || null;
}

// Findymail's /search/name wants an actual domain, not a free-text company name.
// The company field coming from the UI can be either — guess a domain when it
// doesn't already look like one. Wrong guesses just mean no match, not a bad email.
function guessDomain(company: string): string {
  if (company.includes(".")) return company.toLowerCase().trim();
  return `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
}

// Drop-in alongside findEmailViaHunter — same "email or null" shape.
// Returns null silently if FINDYMAIL_API_KEY isn't set, so this stays fully optional.
export async function findEmailViaFindymail(
  fullName: string,
  company: string
): Promise<string | null> {
  const key = getKey();
  if (!key || !fullName.trim() || !company.trim()) return null;

  try {
    const res = await fetch(`${FINDYMAIL_BASE}/search/name`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, domain: guessDomain(company) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const email: string | undefined = data?.contact?.email;
    return email || null;
  } catch {
    return null;
  }
}

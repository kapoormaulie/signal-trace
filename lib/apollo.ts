const APOLLO_BASE = "https://api.apollo.io/v1";

export interface ApolloPayload {
  firstName: string;
  lastName: string;
  email?: string;
  companyName: string;
  title?: string;
  linkedinUrl?: string;
}

export interface MatchedPerson {
  email: string | null;
  title: string | null;
  apolloId: string | null;
}

function getKey(override?: string): string {
  const key = override || process.env.APOLLO_API_KEY;
  if (!key) throw new Error("APOLLO_API_KEY not set");
  return key;
}

export async function matchPersonInApollo(
  firstName: string,
  lastName: string,
  companyName: string,
  linkedinUrl?: string,
  apiKey?: string
): Promise<MatchedPerson> {
  const res = await fetch(`${APOLLO_BASE}/people/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": getKey(apiKey) },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      organization_name: companyName,
      linkedin_url: linkedinUrl,
      reveal_personal_emails: false,
    }),
  });

  if (!res.ok) return { email: null, title: null, apolloId: null };

  const data = await res.json();
  const person = data.person;
  return {
    email: person?.email ?? null,
    title: person?.title ?? null,
    apolloId: person?.id ?? null,
  };
}

export async function addContactToApollo(payload: ApolloPayload, apiKey?: string): Promise<string> {
  const res = await fetch(`${APOLLO_BASE}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": getKey(apiKey) },
    body: JSON.stringify({
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      organization_name: payload.companyName,
      title: payload.title,
      linkedin_url: payload.linkedinUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo contacts error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.contact?.id as string;
}

export async function addContactToSequence(
  contactId: string,
  sequenceId: string,
  apiKey?: string
): Promise<void> {
  const res = await fetch(
    `${APOLLO_BASE}/emailer_campaigns/${sequenceId}/add_contact_ids`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": getKey(apiKey) },
      body: JSON.stringify({ contact_ids: [contactId] }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo sequence error ${res.status}: ${text}`);
  }
}

const INSTANTLY_BASE = "https://api.instantly.ai/api/v2";

export interface InstantlyLeadPayload {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  customVariables?: Record<string, string>;
}

export async function addLeadToCampaign(payload: InstantlyLeadPayload): Promise<void> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  const campaignId = process.env.INSTANTLY_CAMPAIGN_ID;
  if (!apiKey) throw new Error("INSTANTLY_API_KEY is not set");
  if (!campaignId) throw new Error("INSTANTLY_CAMPAIGN_ID is not set");

  const res = await fetch(`${INSTANTLY_BASE}/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      campaign_id: campaignId,
      email: payload.email,
      first_name: payload.firstName,
      last_name: payload.lastName,
      company_name: payload.companyName,
      custom_variables: payload.customVariables ?? {},
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Instantly API ${res.status}: ${body}`);
  }
}

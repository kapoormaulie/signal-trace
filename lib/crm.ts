// Generic CRM relay — POSTs a prospect payload to any user-supplied webhook URL
// (Zapier, Make, or a native inbound webhook from HubSpot / Pipedrive / Salesforce / etc.)
// so SignalTrace can sync leads into whatever CRM someone already runs, without a
// dedicated API client per provider.
export interface CrmWebhookPayload {
  prospectName: string;
  company: string;
  email?: string;
  title?: string;
  linkedinUrl?: string;
  subjectLine: string;
  emailBody: string;
  signalUsed?: string;
  scores: { personalization: number; clarity: number; cta: number };
  lpUrl: string;
  pushedAt: string;
}

export async function postToCrmWebhook(payload: CrmWebhookPayload, webhookUrl: string): Promise<void> {
  if (!webhookUrl) throw new Error("CRM webhook URL is not set");

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`CRM webhook returned ${res.status}`);
  }
}

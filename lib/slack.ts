export interface SlackSummaryPayload {
  prospectName: string;
  company: string;
  signalUsed: string;
  scores: { personalization: number; clarity: number; cta: number };
  lpUrl: string;
}

export async function postToSlack(payload: SlackSummaryPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("SLACK_WEBHOOK_URL is not set");

  const { prospectName, company, signalUsed, scores, lpUrl } = payload;
  const ts = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const body = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `New lead pushed — ${prospectName} at ${company}` },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Signal used:*\n${signalUsed || "_None — generic email_"}`,
          },
          {
            type: "mrkdwn",
            text: `*Quality scores:*\nPersonalization: ${scores.personalization}/10  Clarity: ${scores.clarity}/10  CTA: ${scores.cta}/10`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Landing page:* <${lpUrl}|View page>`,
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Pushed at ${ts}` }],
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status}`);
  }
}

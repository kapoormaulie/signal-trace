import Groq from "groq-sdk";
import type { GenerationResult, ProspectInput, Signal } from "@/types";
import { log } from "@/lib/logger";

const MODEL = "llama-3.3-70b-versatile";
function groq() { return new Groq({ apiKey: process.env.GROQ_API_KEY! }); }

export interface SenderContext {
  senderCompany: string;
  senderName: string;
  defaultCtaUrl: string;
}

const SYSTEM_PROMPT = `You are an elite B2B cold email copywriter. Your emails feel hand-written, not templated. They are brief, specific, and always open with a concrete observation — never a compliment, never "I hope this finds you well."

You will output ONLY valid JSON matching the schema the user provides. No markdown fences, no explanation, no preamble. Just the raw JSON object.`;

function buildUserPrompt(
  prospect: ProspectInput,
  signal: Signal | null,
  sender: SenderContext
): string {
  const firstName = prospect.name.split(" ")[0];

  const senderBlock = sender.senderCompany
    ? `## Sender (you — the person writing this email)
Company: ${sender.senderCompany}${sender.senderName ? `\nName: ${sender.senderName}` : ""}
Sign the email as ${sender.senderName || "the sender"} from ${sender.senderCompany}.`
    : "";

  const signalBlock = signal
    ? `## Signal (use as the email's opening hook)
Title: ${signal.title}
Summary: ${signal.summary}
URL: ${signal.url}${signal.publishedDate ? `\nPublished: ${signal.publishedDate}` : ""}
Type: ${signal.type === "company" ? "Company news" : "Person-level signal"}`
    : `## No live signal found
Write the email using company context only. Note this in angleReasoning. Score personalization honestly lower.`;

  return `Generate a complete cold email package for this prospect.

## Prospect
Name: ${prospect.name} (first name: ${firstName})
Company: ${prospect.company}${prospect.linkedinUrl ? `\nLinkedIn: ${prospect.linkedinUrl}` : ""}

${senderBlock}

${signalBlock}

## Output schema (return ONLY this JSON, filled in):
{
  "emailBody": "The full email body. Rules: open with a direct, specific reference to the signal or the company. Bridge to why this matters for them. 1 sentence of who you are${sender.senderCompany ? ` (from ${sender.senderCompany})` : ""}. End with a low-friction CTA. Naturally embed [LP_URL] once — e.g. \\"I put something together for you: [LP_URL]\\". Use ${firstName} at least once. 150-200 words total.",
  "subjectLines": [
    { "text": "subject line 1", "reasoning": "one sentence why this works" },
    { "text": "subject line 2", "reasoning": "one sentence why this works" },
    { "text": "subject line 3", "reasoning": "one sentence why this works" },
    { "text": "subject line 4", "reasoning": "one sentence why this works" }
  ],
  "scores": {
    "personalization": 0,
    "clarity": 0,
    "cta": 0
  },
  "angleReasoning": "2-3 sentences: why this signal angle connects to a real pain or goal this prospect likely has, and why it makes this email relevant to open.",
  "landingPageContent": {
    "headline": "Personalized headline for ${prospect.company}${sender.senderCompany ? ` — reference how ${sender.senderCompany} can help them` : ""}. Reference the signal or their company directly.",
    "subheadline": "One sentence: the core value ${sender.senderCompany || "you"} deliver for companies like ${prospect.company}.",
    "body": "3-4 sentences of tailored value prop written specifically for ${prospect.company}. Reference the signal or their company context. Mention ${sender.senderCompany || "your company"} naturally. No generic filler.",
    "ctaText": "Book a 20-min call${sender.senderName ? ` with ${sender.senderName}` : ""}",
    "ctaUrl": ""
  }
}

IMPORTANT: Always output ctaUrl as an empty string exactly: "ctaUrl": "". Never invent or guess a URL.

Score definitions (all 1-10, integer):
- personalization: how specific is this email to THIS prospect vs. a generic contact?
- clarity: is the message clear, skimmable, and free of jargon?
- cta: is the call-to-action specific, low-friction, and likely to get a reply?

Be honest on scores. A no-signal email should not score above 6 on personalization.`;
}

export async function generateEmail(
  prospect: ProspectInput,
  signal: Signal | null,
  sender: SenderContext = { senderCompany: "", senderName: "", defaultCtaUrl: "" }
): Promise<GenerationResult> {
  const startedAt = Date.now();

  const response = await groq().chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(prospect, signal, sender) },
    ],
  });

  const elapsedS = ((Date.now() - startedAt) / 1000).toFixed(1);
  const usage = response.usage;
  log(
    `Groq call complete: model=${MODEL} input_tokens=${usage?.prompt_tokens ?? "?"} output_tokens=${usage?.completion_tokens ?? "?"} elapsed=${elapsedS}s`
  );

  const raw = response.choices[0]?.message?.content ?? "";

  let result: GenerationResult;
  try {
    result = JSON.parse(raw);
  } catch {
    log(`Groq JSON parse failed. First 400 chars: ${raw.slice(0, 400)}`);
    throw new Error("Groq returned malformed JSON — check logs/run.log for details.");
  }

  const firstName = prospect.name.split(" ")[0];
  result.emailBody = result.emailBody.replace(/\[FIRST_NAME\]/gi, firstName);

  // Always use the sender's defaultCtaUrl — never trust the model to generate one
  result.landingPageContent.ctaUrl = sender.defaultCtaUrl ?? "";

  return result;
}

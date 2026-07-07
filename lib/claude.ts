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
  signals: Signal[],
  sender: SenderContext
): string {
  const firstName = prospect.name.split(" ")[0];
  const [firstWord, ...rest] = prospect.name.split(" ");
  const lastName = rest.join(" ");

  // Infer role from prospect name/context
  const roleHints = prospect.linkedinUrl ? `(LinkedIn: ${prospect.linkedinUrl})` : "";

  const senderBlock = sender.senderCompany
    ? `## Sender (you — the person writing this email)
Company: ${sender.senderCompany}${sender.senderName ? `\nName: ${sender.senderName}` : ""}
Sign the email as ${sender.senderName || "the sender"} from ${sender.senderCompany}.`
    : "";

  // Separate signals by type for smarter handling
  const personSignals = signals.filter((s) => s.type === "person");
  const companySignals = signals.filter((s) => s.type === "company");
  const logoSignals = signals.filter((s) => s.type === "logo");

  const signalBlock = signals.length > 0
    ? `## Signals (leverage these to create a uniquely personalized email)

${personSignals.length > 0 ? `**Person-Specific Signals** (${firstName}'s individual context — USE THESE HEAVILY):
${personSignals.map((sig) => `• ${sig.title} — ${sig.summary}`).join("\n")}

` : ""}${logoSignals.length > 0 ? `**Logo/Design Signal** (company positioning):
${logoSignals.map((sig) => `• ${sig.summary}`).join("\n")}

` : ""}${companySignals.length > 0 ? `**Company Context** (use as supporting backdrop):
${companySignals.slice(0, 2).map((sig) => `• ${sig.title}`).join("\n")}
` : ""}

**CRITICAL INSTRUCTIONS FOR PERSONALIZATION:**
1. **Lead with person-specific signals** — what ${firstName} is personally known for, working on, or announced
2. **Adapt angle to role** — if ${firstName} is in a leadership role, speak to their team's needs and vision; if technical, speak to architecture/infrastructure
3. **Connect person → company → solution** — use their recent activity to explain WHY ${sender.senderCompany}'s solution matters to them specifically
4. **Avoid generic copy** — this email should only work for ${firstName}, not "any VP at ${prospect.company}"
5. **Reference 1-2 person signals directly** in the email by name/publication/achievement to prove deep research`
    : `## No live signals found — use company context ONLY
Write the email using only information about ${prospect.company}. In angleReasoning, note that without person-specific signals, personalization is limited. Score personalization honestly lower.`;

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
    "senderCompany": "${sender.senderCompany || ""}",
    "headline": "Start with ${firstName}: one punchy sentence naming a specific opportunity or risk for ${prospect.company} right now, tied to the signal. E.g. '${firstName}, here's the window [signal event] just opened for ${prospect.company}.'",
    "subheadline": "One sentence: what ${sender.senderCompany || "we"} specifically deliver for companies in this exact situation.",
    "body": "2-3 sentences of tailored hero copy for ${prospect.company}. Name the signal, name the stakes, say what ${sender.senderCompany || "we"} do about it. No generic filler.",
    "ctaText": "Book a 20-min call${sender.senderName ? ` with ${sender.senderName}` : ""}",
    "ctaUrl": "",
    "heroStat": "A specific, credible number relevant to the opportunity — pipeline value, time savings, percentage gain. E.g. '$2.4M', '73%', '6 weeks'. Make it real and plausible for ${prospect.company}'s scale.",
    "heroStatLabel": "3-6 words naming what the stat represents. E.g. 'pipeline from this signal window'.",
    "heroStatSub": "One sentence: where this number comes from or why it applies to ${prospect.company}.",
    "heroMetrics": [
      { "label": "Signal detected", "value": "FILL WITH 3-WORD SUMMARY OF SIGNAL", "tag": "live" },
      { "label": "Opportunity window", "value": "FILL WITH TIME WINDOW E.G. 'Next 3 weeks'", "tag": "opportunity" },
      { "label": "Recommended action", "value": "FILL WITH SPECIFIC ACTION E.G. 'Schedule discovery call'", "tag": "action" }
    ],
    "tickerItems": [
      "SPECIFIC STAT 1 with number",
      "SPECIFIC STAT 2 with number",
      "SPECIFIC STAT 3 with number",
      "SPECIFIC STAT 4 with number",
      "SPECIFIC STAT 5 with number",
      "SPECIFIC STAT 6 with number"
    ],
    "stats": [
      { "value": "FILL", "label": "FILL — specific, believable metric for ${sender.senderCompany || "this solution"}" },
      { "value": "FILL", "label": "FILL" },
      { "value": "FILL", "label": "FILL" },
      { "value": "FILL", "label": "FILL" }
    ],
    "problemHeadline": "The real challenge ${prospect.company} is navigating right now — and why the timing matters",
    "problems": [
      { "icon": "📊", "title": "FILL with specific pain title", "description": "2 sentences — specific to ${prospect.company} context and the signal. Reference ${firstName} or ${prospect.company} by name." },
      { "icon": "⏳", "title": "FILL", "description": "2 sentences specific to their situation." },
      { "icon": "🤝", "title": "FILL", "description": "2 sentences." },
      { "icon": "🔄", "title": "FILL", "description": "2 sentences." }
    ],
    "stepsHeadline": "How ${sender.senderCompany || "we"} help ${prospect.company} move fast — without the usual friction",
    "steps": [
      { "title": "FILL — step 1 title", "description": "2 sentences: what happens, why it's fast for ${prospect.company}.", "timing": "Day 1" },
      { "title": "FILL — step 2 title", "description": "2 sentences.", "timing": "Week 1" },
      { "title": "FILL — step 3 title", "description": "2 sentences.", "timing": "Ongoing" }
    ],
    "featuresHeadline": "What ${sender.senderCompany || "we"} delivers for teams like ${prospect.company}",
    "features": [
      { "icon": "⚡", "title": "FILL feature title", "description": "2 sentences specific to their use case." },
      { "icon": "🔌", "title": "FILL", "description": "2 sentences." },
      { "icon": "✅", "title": "FILL", "description": "2 sentences." },
      { "icon": "📈", "title": "FILL", "description": "2 sentences." }
    ],
    "testimonials": [
      { "text": "FILL — 2 sentence testimonial about a specific outcome similar to what ${prospect.company} needs. Sound real, not generic.", "name": "FILL First Last", "role": "FILL VP/Director of Something", "initials": "FL" },
      { "text": "FILL — another specific testimonial from a different angle.", "name": "FILL First Last", "role": "FILL role", "initials": "FL" }
    ],
    "ctaHeadline": "Ready to talk, ${firstName}?",
    "ctaSub": "Book 20 minutes with ${sender.senderName || sender.senderCompany || "our team"}. We'll walk through exactly how this applies to ${prospect.company} — no deck, no sales pitch."
  }
}

IMPORTANT: Always output ctaUrl as an empty string. Replace every FILL placeholder with real, specific content. Make all numbers and claims believable for ${prospect.company}'s context.

Score definitions (all 1-10, integer):
- personalization: how specific is this email to THIS prospect vs. a generic contact?
- clarity: is the message clear, skimmable, and free of jargon?
- cta: is the call-to-action specific, low-friction, and likely to get a reply?

Be honest on scores. A no-signal email should not score above 6 on personalization.`;
}

export async function generateEmail(
  prospect: ProspectInput,
  signals: Signal[] = [],
  sender: SenderContext = { senderCompany: "", senderName: "", defaultCtaUrl: "" }
): Promise<GenerationResult> {
  const startedAt = Date.now();

  const response = await groq().chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(prospect, signals, sender) },
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
  result.landingPageContent.senderCompany = sender.senderCompany;

  // Set logo and design trend if any signal is a logo
  const logoSignal = signals.find((s) => s.type === "logo");
  if (logoSignal?.type === "logo") {
    result.landingPageContent.logoUrl = logoSignal.logoUrl;
    result.landingPageContent.designTrend = logoSignal.designTrend;
  }

  return result;
}

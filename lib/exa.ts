import Exa from "exa-js";
import type { Signal, PersonResult } from "@/types";

let _exa: Exa | undefined;
function exa(): Exa {
  if (!_exa) _exa = new Exa(process.env.EXA_API_KEY!);
  return _exa;
}

function sixMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

export async function fetchCompanySignals(company: string): Promise<Signal[]> {
  const response = await exa().searchAndContents(
    `${company} funding launch product announcement news`,
    {
      numResults: 8,
      summary: { query: `Key business signal or recent news about ${company}` },
      startPublishedDate: sixMonthsAgo(),
      type: "neural",
      category: "news",
    }
  );

  return response.results
    .filter((r) => r.summary)
    .map((r) => ({
      id: r.id,
      title: r.title ?? r.url,
      summary: r.summary as string,
      url: r.url,
      publishedDate: r.publishedDate,
      type: "company" as const,
    }));
}

function parseLinkedInName(title: string): string {
  // "Jane Smith - VP Sales at Acme | LinkedIn" → "Jane Smith"
  return title.split(/\s*[-|]\s*/)[0].trim();
}

function parseLinkedInTitle(title: string): string {
  // "Jane Smith - VP Sales at Acme | LinkedIn" → "VP Sales at Acme"
  const parts = title.split(/\s*[-|]\s*/);
  return (parts[1] ?? "").replace(/\s*\|.*$/, "").trim();
}

export async function fetchPeopleAtCompany(company: string, roleQuery?: string): Promise<PersonResult[]> {
  const roles = roleQuery ?? "CEO founder VP director head president";
  const response = await exa().searchAndContents(
    `${roles} at ${company}`,
    {
      numResults: 10,
      includeDomains: ["linkedin.com"],
      summary: { query: `Who is this person and what is their role at ${company}?` },
      type: "neural",
    }
  );

  return response.results
    .filter((r) => r.url.includes("linkedin.com/in/") && r.title && r.summary)
    // Only keep results where the company name appears in the title or summary
    .filter((r) => {
      const haystack = `${r.title ?? ""} ${r.summary ?? ""}`.toLowerCase();
      return haystack.includes(company.toLowerCase());
    })
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      name: parseLinkedInName(r.title ?? ""),
      title: parseLinkedInTitle(r.title ?? ""),
      linkedinUrl: r.url.split("?")[0],
      summary: r.summary as string,
    }))
    .filter((p) => p.name.length > 1);
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_BLOCKLIST = ["example.com", "sentry.io", "wixpress.com", "cloudflare.com",
  "google.com", "microsoft.com", "apple.com", "w3.org", "schema.org"];

function extractBestEmail(texts: string[], firstName: string, company: string): string | null {
  const firstPart = firstName.toLowerCase().slice(0, 4);
  const companyPart = company.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  const candidates: string[] = [];

  for (const text of texts) {
    const found = text.match(EMAIL_RE) ?? [];
    for (const email of found) {
      const lower = email.toLowerCase();
      if (EMAIL_BLOCKLIST.some((d) => lower.includes(d))) continue;
      if (lower.includes(firstPart) || lower.includes(companyPart)) {
        candidates.unshift(email); // high confidence — name or company in email
      } else {
        candidates.push(email);
      }
    }
  }
  return candidates[0] ?? null;
}

export async function findPersonEmail(
  firstName: string,
  lastName: string,
  company: string,
  linkedinUrl?: string
): Promise<string | null> {
  const queries = [
    `"${firstName} ${lastName}" "${company}" email contact`,
    `"${firstName} ${lastName}" ${company} contact info`,
  ];

  const results = await Promise.allSettled(
    queries.map((q) =>
      exa().searchAndContents(q, {
        numResults: 4,
        type: "neural",
        text: { maxCharacters: 1500 },
      })
    )
  );

  const texts: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value.results) {
        if (item.text) texts.push(item.text);
      }
    }
  }

  // Also search the person's own LinkedIn page text if we have it
  if (linkedinUrl) {
    const liFetch = await exa().searchAndContents(
      `${firstName} ${lastName} ${company} email`,
      { numResults: 3, includeDomains: ["contactout.com", "rocketreach.co", "hunter.io"], type: "neural", text: { maxCharacters: 1000 } }
    ).catch(() => null);
    if (liFetch) texts.push(...liFetch.results.map((r) => r.text ?? ""));
  }

  return extractBestEmail(texts, firstName, company);
}

export async function fetchPersonSignals(linkedinUrl: string): Promise<Signal[]> {
  const response = await exa().findSimilarAndContents(linkedinUrl, {
    numResults: 5,
    summary: {
      query:
        "What is this person known for, recently working on, or publicly advocating?",
    },
    excludeSourceDomain: false,
  });

  return response.results
    .filter((r) => r.summary)
    .map((r) => ({
      id: r.id,
      title: r.title ?? r.url,
      summary: r.summary as string,
      url: r.url,
      publishedDate: r.publishedDate,
      type: "person" as const,
    }));
}

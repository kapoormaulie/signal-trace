import Exa from "exa-js";
import type { Signal, PersonResult } from "@/types";
import { log } from "@/lib/logger";

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// AI-generated summaries use curly quotes ("doesn't" with U+2019) which don't
// match a straight-apostrophe regex at all — silently defeating negation
// detection on any contraction. Normalize before matching.
function normalizeApostrophes(s: string): string {
  return s.replace(/[‘’‛′]/g, "'");
}

// Negation anywhere in a sentence that also mentions the company — "Not
// directly affiliated with Stripe", "no mention of Stripe", "doesn't work
// there" — means the AI summary is explicitly telling us the person ISN'T
// connected to the company.
const NEGATION_NEARBY_RE = /\b(not|no|isn't|isnt|doesn't|doesnt|unrelated|unaffiliated|without|separate from|different from|nothing to do with)\b/i;

// These summaries add redirect language when the person doesn't match — "If
// you're specifically seeking Stripe leadership, I can summarize that
// instead", "If you meant to identify a Stripe executive with a similar
// name, please share more details" — with no plain negation word in the
// sentence at all, just an implied "that's not what this is." Chasing every
// verb variant (seeking/looking for/meant to identify/...) is unbounded, but
// virtually all of them share one structural marker: the sentence opens with
// "If you" as a conditional addressing the reader, not a factual claim about
// the person. None of the genuine positive-match sentences seen do this.
const STARTS_WITH_CONDITIONAL_RE = /^if you\b/i;

// Verify person actually works at company (high confidence check).
// Word-boundary matching — plain .includes() let "Stripes Group" pass a search
// for "Stripe" (a substring match, not a real one), which is how an unrelated
// VC firm's partner ended up surfaced as a Stripe employee.
//
// Checked per-sentence rather than a fixed character window — negation phrasing
// varies too much in length ("There is no evidence in the provided content
// that X has a role at Stripe" puts ~80 characters between "no" and "Stripe")
// for any fixed window to reliably span it. A sentence is the natural unit
// negation scope stays within, regardless of how many words it takes.
//
// An explicit negation found ANYWHERE overrides incidental positive mentions
// elsewhere in the same text, rather than just being skipped — once a summary
// has said "this page is not about Stripe," it will often go on to volunteer
// general background knowledge about the company as bonus context (real
// founders' names, etc.), which reads as a positive mention but has nothing
// to do with the specific person the page is about.
function verifyCompanyMatch(personData: string, companyName: string): boolean {
  const companyVariations = [
    companyName.toLowerCase(),
    companyName.toLowerCase().replace(/\s+/g, ""),
    companyName.toLowerCase().split(/\s/)[0], // First word
  ].filter(Boolean);

  const sentences = normalizeApostrophes(personData).split(/(?<=[.!?])\s+/);
  let sawNegation = false;
  let sawPositive = false;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase().trim();
    const mentionsCompany = companyVariations.some((v) => new RegExp(`\\b${escapeRegExp(v)}\\b`, "i").test(lower));
    if (!mentionsCompany) continue;
    if (NEGATION_NEARBY_RE.test(lower) || STARTS_WITH_CONDITIONAL_RE.test(lower)) {
      sawNegation = true;
      continue;
    }
    sawPositive = true;
  }

  return sawNegation ? false : sawPositive;
}

// Language that indicates the person's relationship to the company is investor/
// advisor/board — not an employee. Search strategies that target Crunchbase
// "investors, board members" pages will otherwise surface these as if they
// worked there, which is how e.g. a company's angel investor gets treated as
// a cold-email target for that company.
const NON_EMPLOYEE_ROLE_RE = /\b(investor|board member|board of directors|advisor|advisory board|backed by|portfolio compan)/i;

function isLikelyCurrentEmployee(personData: string): boolean {
  return !NON_EMPLOYEE_ROLE_RE.test(personData);
}

// Score confidence of person match (0-100)
function scoreConfidence(url: string, title: string, summary: string, company: string): number {
  let score = 50; // Base confidence

  // LinkedIn profile = high confidence
  if (url.includes("linkedin.com/in/")) score += 25;

  // Crunchbase = high confidence
  if (url.includes("crunchbase.com")) score += 20;

  // Title clearly shows company
  if (title.toLowerCase().includes(company.toLowerCase())) score += 15;

  // Summary mentions company with role
  if (summary?.toLowerCase().includes(company.toLowerCase())) score += 10;

  // Current role keywords boost confidence
  const currentRoles = ["CEO", "VP", "CTO", "CFO", "CMO", "COO", "founder", "president"];
  if (currentRoles.some((r) => title.toUpperCase().includes(r))) score += 10;

  // Recent mention (not old archive)
  if (!url.includes("/archive") && !url.includes("/old/")) score += 5;

  return Math.min(100, score);
}

// Extract company domain from name (e.g., "Google" → "google.com")
function getCompanyDomain(companyName: string): string[] {
  const clean = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

  const variants = [
    clean.replace(/\s+/g, ""), // "google" from "Google"
    clean.split(" ")[0], // "google" from "google cloud"
    companyName.toLowerCase().replace(/\s+/g, "-"), // "google-cloud"
  ];

  return variants.map((v) => `${v}.com`);
}

// Validate email format and domain
function isValidEmail(email: string, companyName: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  const lower = email.toLowerCase();

  // Filter out spam/test emails
  const blocklist = [
    "noreply",
    "test",
    "admin",
    "support@",
    "hello@",
    "info@",
    "contact@",
    "example.com",
    "test.com",
    "mail.com",
    "domain.com",
    "company.com",
    "business.com",
    "email.com",
    "corporate.com",
  ];

  if (blocklist.some((b) => lower.includes(b))) return false;

  // STRICT: Email domain should match company (or be close)
  const companyDomains = getCompanyDomain(companyName);
  const emailDomain = email.split("@")[1]?.toLowerCase();

  if (!emailDomain) return false;

  // Check if email domain is company domain or very similar
  const isCompanyEmail = companyDomains.some((cd) => emailDomain.includes(cd.replace(".com", "")));

  if (!isCompanyEmail) {
    // Allow some common professional domains (LinkedIn, etc) only if HIGH confidence
    const allowedDomains = ["linkedin.com", "github.com"];
    const isAllowed = allowedDomains.includes(emailDomain);
    if (!isAllowed) {
      return false; // Domain doesn't match company - likely wrong email
    }
  }

  return true;
}

export async function fetchPeopleAtCompany(company: string, roleQuery?: string): Promise<PersonResult[]> {
  const roles = roleQuery ?? "CEO founder VP director head president executive COO CFO CMO CTO";
  const seen = new Set<string>();
  const people: PersonResult[] = [];

  // STRATEGY 1: Multi-faceted Exa searches
  const exaSearches = [
    // Core LinkedIn profiles with various role keywords
    exa().searchAndContents(
      `site:linkedin.com/in ${company} ${roles}`,
      {
        numResults: 15,
        includeDomains: ["linkedin.com"],
        summary: { query: `Who is this person and what is their role at ${company}?` },
        type: "neural",
      }
    ),
    // Company leadership/team page mentions
    exa().searchAndContents(
      `${company} leadership team management board executives`,
      {
        numResults: 12,
        summary: { query: `Who are the executives and leaders at ${company}?` },
        type: "neural",
      }
    ),
    // News announcements of new hires/promotions/appointments
    exa().searchAndContents(
      `${company} announces appoints promotes hires names ${roles}`,
      {
        numResults: 12,
        summary: { query: `Who recently joined or got promoted at ${company}?` },
        type: "neural",
        startPublishedDate: sixMonthsAgo(),
      }
    ),
    // Press releases and official announcements
    exa().searchAndContents(
      `"${company}" press release team "joins" OR "appointed" OR "named"`,
      {
        numResults: 10,
        summary: { query: `Who is joining or has been appointed at ${company}?` },
        type: "keyword",
        startPublishedDate: sixMonthsAgo(),
      }
    ),
    // Crunchbase and business databases
    exa().searchAndContents(
      `${company} team profile founders investors board members`,
      {
        numResults: 12,
        includeDomains: ["crunchbase.com", "angel.co", "pitchbook.com"],
        summary: { query: `Who are the key people and founders at ${company}?` },
        type: "neural",
      }
    ),
    // Company website team/about pages
    exa().searchAndContents(
      `${company} /team OR /about OR /leadership site:${company.toLowerCase().replace(/\s+/g, "")}.*`,
      {
        numResults: 10,
        summary: { query: `Who are the team members shown on ${company}'s website?` },
        type: "neural",
      }
    ),
    // Funding announcements (founders and key team usually mentioned)
    exa().searchAndContents(
      `${company} funding round Series A B C announces funding`,
      {
        numResults: 8,
        summary: { query: `Who are the leaders at ${company} mentioned in funding announcements?` },
        type: "neural",
        startPublishedDate: sixMonthsAgo(),
      }
    ),
  ];

  const exaResults = await Promise.allSettled(exaSearches);

  // Process Exa results with confidence scoring
  for (const result of exaResults) {
    if (result.status !== "fulfilled") continue;

    for (const r of result.value.results) {
      // LinkedIn profiles
      if (r.url.includes("linkedin.com/in/")) {
        const linkedinUrl = r.url.split("?")[0];
        if (seen.has(linkedinUrl)) continue;

        const rawTitle = r.title ?? "";
        const roleTitle = parseLinkedInTitle(rawTitle);
        // LinkedIn's indexed page title doesn't always include the role/company
        // suffix (varies by profile), so check title+summary combined for recall —
        // the word-boundary fix in verifyCompanyMatch plus the non-employee filter
        // below are the real defense against false positives, not restricting the field.
        if (!verifyCompanyMatch(`${rawTitle} ${r.summary ?? ""}`, company)) continue;
        if (!isLikelyCurrentEmployee(`${rawTitle} ${r.summary ?? ""}`)) continue;

        const name = parseLinkedInName(rawTitle);
        if (name.length < 2) continue;

        const confidence = scoreConfidence(r.url, rawTitle, r.summary ?? "", company);

        seen.add(linkedinUrl);
        people.push({
          id: r.id,
          name,
          title: roleTitle,
          linkedinUrl,
          summary: r.summary as string,
          confidence,
          source: "linkedin",
        });
      }
      // Crunchbase profiles
      else if (r.url.includes("crunchbase.com")) {
        const crunchId = `crunchbase:${r.id}`;
        if (seen.has(crunchId)) continue;

        const title = r.title ?? "";
        if (!title) continue;

        if (!verifyCompanyMatch(`${title} ${r.summary ?? ""}`, company)) continue;
        if (!isLikelyCurrentEmployee(`${title} ${r.summary ?? ""}`)) continue;

        const nameMatch = title.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
        if (!nameMatch) continue;

        const name = nameMatch[1];
        if (seen.has(name)) continue;

        const confidence = scoreConfidence(r.url, title, r.summary ?? "", company);

        seen.add(crunchId);
        seen.add(name);
        people.push({
          id: r.id,
          name,
          title: title.includes("-") ? title.split("-")[1]?.trim() ?? "Executive" : "Executive",
          linkedinUrl: "",
          summary: r.summary as string,
          confidence,
          source: "crunchbase",
        });
      }
      // Angel List / business profiles
      else if ((r.url.includes("angel.co") || r.url.includes("pitchbook")) && r.title && r.summary) {
        const personId = `angel:${r.id}`;
        if (seen.has(personId)) continue;

        if (!verifyCompanyMatch(`${r.title} ${r.summary}`, company)) continue;
        if (!isLikelyCurrentEmployee(`${r.title} ${r.summary}`)) continue;

        const name = r.title.split(/\s*[-–—]\s*/)[0].trim();
        if (name.length < 3 || seen.has(name)) continue;

        const confidence = scoreConfidence(r.url, r.title, r.summary, company);

        seen.add(personId);
        seen.add(name);
        people.push({
          id: r.id,
          name,
          title: "Executive / Founder",
          linkedinUrl: "",
          summary: r.summary as string,
          confidence,
          source: "angel",
        });
      }
    }
  }

  // STRATEGY 2: Apollo.io enrichment (if API key available)
  if (process.env.APOLLO_API_KEY && people.length < 15) {
    try {
      const apolloResults = await searchPeopleApollo(company);
      for (const person of apolloResults) {
        if (seen.has(person.linkedinUrl) || seen.has(person.name)) continue;
        seen.add(person.linkedinUrl || person.name);
        person.confidence = (person.confidence || 0) + 20; // Apollo boost for verified data
        person.source = "apollo";
        people.push(person);
        if (people.length >= 20) break;
      }
    } catch (err) {
      // Apollo search optional, continue without it
    }
  }

  // Sort by confidence (highest first), then remove low-confidence duplicates
  people.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  const finalPeople: PersonResult[] = [];
  const namesSeen = new Set<string>();

  for (const person of people) {
    // Skip if low confidence AND we already have this person
    if ((person.confidence ?? 0) < 40 && namesSeen.has(person.name)) continue;

    namesSeen.add(person.name);
    finalPeople.push(person);

    if (finalPeople.length >= 20) break;
  }

  return finalPeople;
}

// Apollo.io people search integration
async function searchPeopleApollo(company: string): Promise<PersonResult[]> {
  try {
    const response = await fetch("https://api.apollo.io/v1/employees/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.APOLLO_API_KEY!,
      },
      body: JSON.stringify({
        organization_name: company,
        page: 1,
        per_page: 20,
        include_organization_data: true,
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      employees?: Array<{
        name?: string;
        title?: string;
        linkedin_url?: string;
        email?: string;
      }>;
    };

    return (data.employees || [])
      .filter((emp) => emp.name && emp.title)
      .map((emp) => ({
        id: `apollo:${emp.email || emp.name}`,
        name: emp.name || "",
        title: emp.title || "Employee",
        linkedinUrl: emp.linkedin_url || "",
        summary: `${emp.title || "Team member"} at ${company}`,
      }));
  } catch (err) {
    return [];
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_BLOCKLIST = ["example.com", "sentry.io", "wixpress.com", "cloudflare.com",
  "google.com", "microsoft.com", "apple.com", "w3.org", "schema.org"];
// Generic role mailboxes and placeholder names — never the specific person we're
// searching for, but common in scraped "e.g. john.doe@company.com" format examples.
const GENERIC_LOCAL_PARTS = new Set([
  "info", "contact", "support", "hello", "admin", "sales", "help", "press", "media",
  "careers", "jobs", "privacy", "legal", "security", "abuse", "noreply", "no-reply",
  "webmaster", "example", "test", "sample", "yourname", "firstname.lastname",
  "john.doe", "jane.doe", "name.surname", "first.last", "john", "jane", "doe",
  "johndoe", "janedoe", "j.doe", "j.smith", "smith",
]);

// Rejects masked/placeholder emails scraped from web copy (e.g. "ixxxxxx@company.com"
// shown as a format example on some page) — 3+ identical characters in a row in the
// local part is not a pattern real email addresses have.
function isPlausibleEmail(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (!local) return false;
  if (/(.)\1{2,}/.test(local)) return false;
  if (GENERIC_LOCAL_PARTS.has(local)) return false;
  return true;
}

function extractBestEmail(texts: string[], firstName: string, lastName: string): string | null {
  const firstPart = firstName.toLowerCase().slice(0, 3);
  const lastPart = lastName.toLowerCase().slice(0, 3);
  const candidates: string[] = [];

  for (const text of texts) {
    const found = text.match(EMAIL_RE) ?? [];
    for (const email of found) {
      const lower = email.toLowerCase();
      const local = lower.split("@")[0] ?? "";
      if (EMAIL_BLOCKLIST.some((d) => lower.includes(d))) continue;
      if (!isPlausibleEmail(email)) continue;
      // Require the local part to actually relate to THIS person's name — a matching
      // company domain alone isn't distinguishing evidence, every real employee's
      // email matches the domain too. This is what let scraped placeholders like
      // "doe@stripe.com" (a format example, not a real person) through before.
      const nameMatches =
        (firstPart.length >= 2 && local.includes(firstPart)) ||
        (lastPart.length >= 2 && local.includes(lastPart));
      if (!nameMatches) continue;
      candidates.push(email);
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
  // Note: FullEnrich and AI Ark are already tried, correctly, earlier in the
  // /api/people waterfall (lib/fullenrich.ts, lib/aiark.ts) before this function
  // is ever reached — this used to duplicate that work against wrong/nonexistent
  // hosts (api.fullenrich.com, api.aiark.com) and always failed silently. Removed.

  // STRATEGY 2: Web search for email (Exa + manual extraction)
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

  // STRATEGY 3: LinkedIn page searches via known email domains
  if (linkedinUrl) {
    const liFetch = await exa().searchAndContents(
      `${firstName} ${lastName} ${company} email`,
      { numResults: 3, includeDomains: ["contactout.com", "rocketreach.co", "hunter.io"], type: "neural", text: { maxCharacters: 1000 } }
    ).catch(() => null);
    if (liFetch) texts.push(...liFetch.results.map((r) => r.text ?? ""));
  }

  // STRATEGY 4: Hunter.io API (if available)
  const hunterEmail = await enrichEmailWithHunter(firstName, lastName, company);
  if (hunterEmail) return hunterEmail;

  // STRATEGY 5: Extract from web search results
  const webEmail = extractBestEmail(texts, firstName, lastName);
  if (webEmail) return webEmail;

  return null;
}

// Hunter.io API integration
async function enrichEmailWithHunter(
  firstName: string,
  lastName: string,
  company: string
): Promise<string | null> {
  if (!process.env.HUNTER_API_KEY) return null;

  try {
    const domain = company
      .toLowerCase()
      .replace(/\s+/g, "")
      .concat(".com");

    const response = await fetch(
      `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${process.env.HUNTER_API_KEY}`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      data?: { email?: string };
    };

    return data.data?.email || null;
  } catch (err) {
    return null;
  }
}

export async function findPersonLinkedInUrl(name: string, company: string): Promise<string | null> {
  try {
    const response = await exa().searchAndContents(
      `site:linkedin.com/in ${name} ${company}`,
      { numResults: 1, includeDomains: ["linkedin.com"] }
    );
    return response.results[0]?.url ?? null;
  } catch (err) {
    log(`findPersonLinkedInUrl error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function fetchPersonSignals(linkedinUrlOrName: string, company?: string): Promise<Signal[]> {
  // Accept either a full LinkedIn URL or just a name
  // LinkedIn URL format: linkedin.com/in/jane-smith-123 → jane smith
  // Direct name format: jane-smith → jane smith
  let liName = "";
  const isLinkedInUrl = linkedinUrlOrName.includes("linkedin.com/in/");

  if (isLinkedInUrl) {
    const nameMatch = linkedinUrlOrName.match(/linkedin\.com\/in\/([a-z0-9-]+)/i);
    liName = nameMatch ? nameMatch[1].replace(/-\d+$/, "").replace(/-/g, " ") : "";
  } else {
    // Assume it's a direct name (already in slug format or plain)
    liName = linkedinUrlOrName.replace(/-/g, " ").trim();
  }

  log(`fetchPersonSignals: input="${linkedinUrlOrName}", company="${company ?? "none"}", extracted name="${liName}"`);

  const searches: Promise<Signal[]>[] = [];

  // 1. LinkedIn-similar content (what they're associated with) — only if we have a full URL
  if (isLinkedInUrl) {
    searches.push(
      exa()
        .findSimilarAndContents(linkedinUrlOrName, {
          numResults: 6,
          summary: {
            query: "What is this person known for, working on, or advocating?",
          },
          excludeSourceDomain: false,
        })
        .then((r) =>
          r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: `${res.title ?? res.url}`,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }))
        )
        .catch(() => [])
    );
  }

  // For name-only searches (no LinkedIn URL), search for company news mentioning the person
  if (!isLinkedInUrl && liName && company) {
    const companyNewsQuery = `"${liName}" ${company} news announcement CEO founder executive leadership`;
    log(`fetchPersonSignals: NAME-ONLY search for: ${companyNewsQuery}`);

    searches.push(
      exa()
        .searchAndContents(
          companyNewsQuery,
          {
            numResults: 8,
            summary: {
              query: `What news or announcements mention ${liName} at ${company}?`,
            },
            type: "neural",
            startPublishedDate: sixMonthsAgo(),
          }
        )
        .then((r) => {
          log(`fetchPersonSignals: NAME-ONLY search returned ${r.results.length} results`);
          return r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: res.title ?? res.url,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }));
        })
        .catch((err) => {
          log(`fetchPersonSignals: NAME-ONLY search error: ${err instanceof Error ? err.message : String(err)}`);
          return [];
        })
    );
  }

  if (liName && isLinkedInUrl) {
    log(`fetchPersonSignals: liName is not empty, running searches for "${liName}"${company ? ` at ${company}` : ""}`);
    const companyQuery = company ? `${company}` : "";

    // 2. Career announcements and job changes
    searches.push(
      exa()
        .searchAndContents(
          `"${liName}" ${companyQuery} promotion announcement joined appointed hired "new role" OR "now leading" OR "appointed as"`,
          {
            numResults: 6,
            summary: {
              query: `What recent career announcement or job change involves ${liName}?`,
            },
            type: "neural",
            startPublishedDate: sixMonthsAgo(),
          }
        )
        .then((r) =>
          r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: `${liName} — ${res.title ?? res.url}`,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }))
        )
        .catch(() => [])
    );

    // 3. Articles/publications by the person
    searches.push(
      exa()
        .searchAndContents(
          `"${liName}" ${companyQuery} wrote published author opinion article blog post medium`,
          {
            numResults: 6,
            summary: {
              query: `What articles or thought leadership has ${liName} published?`,
            },
            type: "neural",
            startPublishedDate: sixMonthsAgo(),
          }
        )
        .then((r) =>
          r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: `${liName} — ${res.title ?? res.url}`,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }))
        )
        .catch(() => [])
    );

    // 4. Speaking engagements and conference mentions
    searches.push(
      exa()
        .searchAndContents(
          `"${liName}" ${companyQuery} speaking conference keynote panel podcast interview`,
          {
            numResults: 5,
            summary: {
              query: `Where has ${liName} spoken or given interviews?`,
            },
            type: "neural",
            startPublishedDate: sixMonthsAgo(),
          }
        )
        .then((r) =>
          r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: `${liName} — ${res.title ?? res.url}`,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }))
        )
        .catch(() => [])
    );

    // 5. Product/company milestones led by this person
    searches.push(
      exa()
        .searchAndContents(
          `"${liName}" ${companyQuery} launches product feature release announcement milestone`,
          {
            numResults: 5,
            summary: {
              query: `What products or milestones has ${liName} announced or led?`,
            },
            type: "neural",
            startPublishedDate: sixMonthsAgo(),
          }
        )
        .then((r) =>
          r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: `${liName} — ${res.title ?? res.url}`,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }))
        )
        .catch(() => [])
    );

    // 6. Industry recognition and awards
    searches.push(
      exa()
        .searchAndContents(
          `"${liName}" ${companyQuery} award recognized named "40 under 40" OR "most influential" OR "top leaders"`,
          {
            numResults: 4,
            summary: {
              query: `Has ${liName} received any industry recognition or awards?`,
            },
            type: "neural",
            startPublishedDate: sixMonthsAgo(),
          }
        )
        .then((r) =>
          r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: `${liName} — ${res.title ?? res.url}`,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }))
        )
        .catch(() => [])
    );

    // 7. Company/team growth under their leadership
    searches.push(
      exa()
        .searchAndContents(
          `"${liName}" ${companyQuery} team growth expansion hiring department milestone`,
          {
            numResults: 4,
            summary: {
              query: `What team or company growth has ${liName} led?`,
            },
            type: "neural",
            startPublishedDate: sixMonthsAgo(),
          }
        )
        .then((r) =>
          r.results
            .filter((res) => res.summary)
            .map((res) => ({
              id: res.id,
              title: `${liName} — ${res.title ?? res.url}`,
              summary: res.summary as string,
              url: res.url,
              publishedDate: res.publishedDate,
              type: "person" as const,
            }))
        )
        .catch(() => [])
    );
  }

  const results = await Promise.allSettled(searches);
  const allSignals: Signal[] = [];

  results.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      const count = r.value.length;
      allSignals.push(...r.value);
      if (count > 0) {
        log(`fetchPersonSignals search #${idx}: ${count} signals`);
      }
    } else {
      log(`fetchPersonSignals search #${idx}: error — ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    }
  });

  // Remove duplicates, keep newest first
  const seen = new Set<string>();
  const final = allSignals
    .filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    })
    .sort((a, b) => {
      const aDate = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const bDate = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, 10); // Return up to 10 person-specific signals

  log(`fetchPersonSignals: returning ${final.length} unique signals after dedup`);
  return final;
}

import { NextRequest, NextResponse } from "next/server";
import { fetchPeopleAtCompany, fetchCompanySignals, fetchPersonSignals, findPersonEmail } from "@/lib/exa";
import { generateEmail, SenderContext } from "@/lib/claude";
import { matchPersonInApollo, addContactToApollo, addContactToSequence } from "@/lib/apollo";
import { findEmailViaHunter } from "@/lib/hunter";
import { saveProspect } from "@/lib/redis";
import { saveLp } from "@/lib/redis";
import { makeSlug } from "@/lib/slugify";
import { log } from "@/lib/logger";

const ROLE_QUERIES: Record<string, string> = {
  "decision-maker": "CEO OR founder OR president OR owner",
  sales: '"VP Sales" OR "Head of Sales" OR "CRO" OR "Sales Director" OR "VP of Sales"',
  marketing: '"CMO" OR "VP Marketing" OR "Head of Marketing" OR "Marketing Director"',
  product: '"CPO" OR "VP Product" OR "Head of Product" OR "Product Director"',
  any: "CEO OR VP OR director OR head OR founder OR president",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const company: string = body?.company?.trim() ?? "";
  const targetRole: string = body?.targetRole ?? "decision-maker";
  const autoPush: boolean = body?.autoPush !== false;
  const minScore: number = Number(body?.minScore ?? 6);
  const deviceId: string | undefined = body?.deviceId || undefined;
  const userId: string | undefined = body?.userId || undefined;
  const sender: SenderContext = {
    senderCompany: body?.senderCompany ?? "",
    senderName: body?.senderName ?? "",
    defaultCtaUrl: body?.defaultCtaUrl ?? "",
  };

  if (!company) {
    return NextResponse.json({ error: "company is required" }, { status: 400 });
  }

  log(`bulk | start: company="${company}" role=${targetRole} autoPush=${autoPush} minScore=${minScore}`);

  try {
    // 1. Find top person at company
    const roleQuery = ROLE_QUERIES[targetRole] ?? ROLE_QUERIES.any;
    const people = await fetchPeopleAtCompany(company, roleQuery);
    if (people.length === 0) {
      return NextResponse.json({ error: `No people found at ${company}` }, { status: 404 });
    }
    const person = people[0];
    log(`bulk | top person: ${person.name} (${person.title}) @ ${company}`);

    // 2. Fetch signals in parallel
    const [companySignals, personSignals] = await Promise.all([
      fetchCompanySignals(company).catch(() => []),
      person.linkedinUrl ? fetchPersonSignals(person.linkedinUrl).catch(() => []) : Promise.resolve([]),
    ]);
    const signals = [...personSignals, ...companySignals];
    const signal = signals[0] ?? null;
    log(`bulk | signals: ${signals.length} found, using: ${signal?.title ?? "none"}`);

    // 3. Generate email
    const prospect = {
      name: person.name,
      company,
      linkedinUrl: person.linkedinUrl,
    };
    const result = await generateEmail(prospect, signal, sender);

    // 4. Save LP
    const slug = makeSlug(person.name, company);
    const origin = req.headers.get("origin") ??
      `http://${req.headers.get("host") ?? "localhost:3000"}`;
    const lpUrl = `${origin}/lp/${slug}`;
    await saveLp(slug, result.landingPageContent);

    // Substitute LP URL into email body
    const emailBody = result.emailBody.replace(/\[LP_URL\]/g, lpUrl);

    // 5. Push to Apollo (only if autoPush enabled and scores meet threshold)
    const avgScore = (result.scores.personalization + result.scores.clarity + result.scores.cta) / 3;
    const shouldPush = autoPush && avgScore >= minScore;
    log(`bulk | avgScore=${avgScore.toFixed(1)} minScore=${minScore} shouldPush=${shouldPush}`);

    const [firstName, ...rest] = person.name.trim().split(" ");
    const lastName = rest.join(" ") || "-";

    // Find email via Hunter.io + Exa web search + Apollo match in parallel
    const [hunterEmailResult, exaEmailResult, apolloMatchResult] = await Promise.allSettled([
      findEmailViaHunter(firstName, lastName, company),
      findPersonEmail(firstName, lastName, company, person.linkedinUrl),
      shouldPush
        ? matchPersonInApollo(firstName, lastName, company, person.linkedinUrl)
        : Promise.resolve({ email: null, title: null, apolloId: null }),
    ]);

    const hunterEmail = hunterEmailResult.status === "fulfilled" ? hunterEmailResult.value : null;
    const exaEmail = exaEmailResult.status === "fulfilled" ? exaEmailResult.value : null;
    const matched = apolloMatchResult.status === "fulfilled"
      ? apolloMatchResult.value
      : { email: null, title: null, apolloId: null };

    // Hunter is purpose-built + confidence-scored, so it wins when it has an answer
    const foundEmail = hunterEmail ?? exaEmail ?? matched?.email ?? null;
    if (foundEmail) log(`bulk | email found for ${person.name}: ${foundEmail} (via ${hunterEmail ? "Hunter" : exaEmail ? "Exa" : "Apollo"})`);

    const contactId = shouldPush ? await addContactToApollo({
      firstName,
      lastName,
      email: foundEmail ?? undefined,
      companyName: company,
      title: person.title || matched?.title || undefined,
      linkedinUrl: person.linkedinUrl,
    }).catch((err) => {
      log(`bulk | apollo error (non-fatal): ${err.message}`);
      return null;
    }) : null;

    // 6. Enroll in Apollo sequence if configured
    const sequenceId = process.env.APOLLO_SEQUENCE_ID;
    if (sequenceId && contactId) {
      await addContactToSequence(contactId, sequenceId).catch((err) => {
        log(`bulk | sequence enroll error (non-fatal): ${err.message}`);
      });
    }

    // 7. Save to history
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const subjectLine = result.subjectLines[0]?.text ?? "";
    await saveProspect({
      id,
      name: person.name,
      company,
      linkedinUrl: person.linkedinUrl,
      emailBody,
      subjectLine,
      lpSlug: slug,
      lpUrl,
      scores: result.scores,
      signalUsed: signal?.title,
      contactedAt: new Date().toISOString(),
      lpVisits: [],
      pushed: !!contactId,
      deviceId,
      userId,
    });

    log(`bulk | done: ${person.name} @ ${company} | scores P=${result.scores.personalization} C=${result.scores.clarity} CTA=${result.scores.cta}`);

    return NextResponse.json({
      success: true,
      person: { name: person.name, title: person.title, linkedinUrl: person.linkedinUrl, email: foundEmail },
      emailBody,
      subjectLine,
      lpUrl,
      scores: result.scores,
      apolloContactId: contactId,
      enrolledInSequence: !!(sequenceId && contactId),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`bulk | error for "${company}": ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

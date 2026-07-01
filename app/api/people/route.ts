import { NextRequest, NextResponse } from "next/server";
import { fetchPeopleAtCompany, findPersonEmail } from "@/lib/exa";
import { matchPersonInApollo } from "@/lib/apollo";
import { findEmailViaHunter } from "@/lib/hunter";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const company: string = body?.company?.trim() ?? "";

  if (!company) {
    return NextResponse.json({ error: "company is required" }, { status: 400 });
  }

  log(`people-lookup | company="${company}"`);

  try {
    const people = await fetchPeopleAtCompany(company);
    log(`people-lookup | found ${people.length} people at ${company}`);

    // Enrich all people with emails in parallel (Exa web search + Apollo match)
    const enriched = await Promise.all(
      people.map(async (person) => {
        const [firstName, ...rest] = person.name.trim().split(" ");
        const lastName = rest.join(" ") || "-";

        const [hunterEmail, exaEmail, apolloMatch] = await Promise.allSettled([
          findEmailViaHunter(firstName, lastName, company),
          findPersonEmail(firstName, lastName, company, person.linkedinUrl),
          matchPersonInApollo(firstName, lastName, company, person.linkedinUrl),
        ]);

        // Hunter is purpose-built for this (confidence-scored), so it wins when it has an answer.
        const email =
          (hunterEmail.status === "fulfilled" ? hunterEmail.value : null) ??
          (exaEmail.status === "fulfilled" ? exaEmail.value : null) ??
          (apolloMatch.status === "fulfilled" ? apolloMatch.value?.email : null) ??
          undefined;

        if (email) log(`people-lookup | email found for ${person.name}: ${email}`);

        return { ...person, email };
      })
    );

    return NextResponse.json({ people: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`people-lookup | error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchCompanySignals, fetchPersonSignals } from "@/lib/exa";
import { getAllProspects } from "@/lib/redis";
import { findFuzzyDuplicate } from "@/lib/fuzzy";
import { log } from "@/lib/logger";
import type { ProspectInput, Signal } from "@/types";

export async function POST(req: NextRequest) {
  const { name, company, linkedinUrl }: ProspectInput & { force?: boolean } =
    await req.json();

  if (!name?.trim() || !company?.trim()) {
    return NextResponse.json(
      { error: "name and company are required" },
      { status: 400 }
    );
  }

  log(
    `Run start: prospect="${name}" company="${company}" linkedin=${linkedinUrl ? "yes" : "no"}`
  );

  // Duplicate check + Exa calls run in parallel to keep latency low
  const [history, companySignals, personSignals] = await Promise.allSettled([
    getAllProspects(),
    fetchCompanySignals(company).catch((err) => {
      log(`Exa company signals error for "${company}": ${err instanceof Error ? err.message : String(err)}`);
      return [] as Signal[];
    }),
    linkedinUrl
      ? fetchPersonSignals(linkedinUrl).catch((err) => {
          log(`Exa person signals error for "${linkedinUrl}": ${err instanceof Error ? err.message : String(err)}`);
          return [] as Signal[];
        })
      : Promise.resolve([] as Signal[]),
  ]);

  // Fuzzy duplicate check
  const prospects = history.status === "fulfilled" ? history.value : [];
  const duplicate = findFuzzyDuplicate(name, company, prospects);

  if (duplicate) {
    log(
      `Fuzzy duplicate found: "${name}" at "${company}" matches existing prospect id=${duplicate.id} contacted ${duplicate.contactedAt}`
    );
  } else {
    log(`Fuzzy duplicate check: no match for "${name}" at "${company}"`);
  }

  const signals: Signal[] = [
    ...(companySignals.status === "fulfilled" ? companySignals.value : []),
    ...(personSignals.status === "fulfilled" ? personSignals.value : []),
  ];

  log(
    `Exa returned ${signals.length} signal(s) for "${company}"${linkedinUrl ? ` + person from ${linkedinUrl}` : ""}`
  );

  return NextResponse.json({
    signals,
    noSignals: signals.length === 0,
    duplicate: duplicate
      ? {
          id: duplicate.id,
          name: duplicate.name,
          company: duplicate.company,
          contactedAt: duplicate.contactedAt,
        }
      : null,
  });
}

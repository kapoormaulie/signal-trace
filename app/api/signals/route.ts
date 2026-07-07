import { NextRequest, NextResponse } from "next/server";
import { fetchCompanySignals, fetchPersonSignals } from "@/lib/exa";
import { getAllProspects, getCompanyData, saveCompanyData } from "@/lib/redis";
import { findFuzzyDuplicate } from "@/lib/fuzzy";
import { log } from "@/lib/logger";
import { processLogoSignal } from "@/lib/logo";
import type { ProspectInput, Signal } from "@/types";

export async function POST(req: NextRequest) {
  const { name, company, linkedinUrl, forceRefresh }: ProspectInput & { forceRefresh?: boolean } =
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

  // Extract domain from company name (assume it's company.com or similar)
  const domain = company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .concat(".com");

  // Check if we have cached company data (and it's fresh)
  let cachedData: Awaited<ReturnType<typeof getCompanyData>> = null;
  if (!forceRefresh) {
    cachedData = await getCompanyData(company).catch(() => null);
    if (cachedData && cachedData.meta) {
      log(`Using cached data for "${company}" (${cachedData.meta.peopleCount} people, ${cachedData.meta.signalsCount} signals, confidence: ${cachedData.meta.confidence}%)`);
    }
  }

  // Duplicate check + Exa calls + logo signal run in parallel to keep latency low
  // Note: We fetch person signals even without LinkedIn URL as a fallback
  const [history, companySignals, personSignalsLinked, personSignalsFallback, logoData] = await Promise.allSettled([
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
    // Fallback: search for person signals by name at company
    name && company
      ? fetchPersonSignals(`https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + " " + company)}`).catch(() => [] as Signal[])
      : Promise.resolve([] as Signal[]),
    processLogoSignal(company, domain).catch((err) => {
      log(`Logo signal error for "${domain}": ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }),
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

  // Use cached signals if available
  let signals: Signal[];
  let logoSignals: Signal[] = [];
  let personSignalList: Signal[] = [];
  let companySignalList: Signal[] = [];

  if (cachedData && cachedData.signals.length > 0) {
    signals = cachedData.signals;
    const logos = signals.filter((s) => s.type === "logo");
    const persons = signals.filter((s) => s.type === "person");
    const companies = signals.filter((s) => s.type === "company");
    logoSignals = logos;
    personSignalList = persons;
    companySignalList = companies;
  } else {
    // Build signals array with smart prioritization
    if (logoData.status === "fulfilled" && logoData.value) {
      const logo = logoData.value;
      logoSignals.push({
        id: `logo-${Date.now()}`,
        type: "logo",
        title: logo.isRebrand ? "🔄 Recent Rebrand" : "🎨 Logo Design Analysis",
        summary: logo.isRebrand
          ? `${company} recently changed their logo — signals a rebrand, rebrand, or strategic pivot. Use this to reference their evolution in your email.`
          : `${company}'s logo reflects ${logo.designTrend} positioning. Tailor your angle to their design language.`,
        url: logo.url,
        logoUrl: logo.url,
        designTrend: logo.designTrend,
        isRebrand: logo.isRebrand,
      });
    }

    // Get person signals (prefer LinkedIn signals, fallback to name-based search)
    personSignalList =
      personSignalsLinked.status === "fulfilled" ? personSignalsLinked.value :
      personSignalsFallback.status === "fulfilled" ? personSignalsFallback.value : [];

    companySignalList = companySignals.status === "fulfilled" ? companySignals.value : [];

    // Prioritize person signals first (unique to the individual), then company signals
    signals = [
      ...logoSignals,
      ...personSignalList, // Person-specific signals appear first
      ...companySignalList, // Company signals as context
    ];

    // Cache the company data for future use
    if (!cachedData) {
      const avgConfidence = 75; // Default confidence for fresh data
      await saveCompanyData(
        company,
        {
          name: company,
          domain,
          peopleCount: 0,
          signalsCount: signals.length,
          lastUpdated: Date.now(),
          confidence: avgConfidence,
        },
        [],
        signals
      ).catch(() => {});
    }
  }

  log(
    `Signals for "${name}" at "${company}": ${logoSignals.length} logo + ${personSignalList.length} person + ${companySignalList.length} company${cachedData ? " (from cache)" : ""}`
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
    cached: !!cachedData,
    cacheAge: cachedData && cachedData.meta ? Math.round((Date.now() - cachedData.meta.lastUpdated) / 1000 / 60) : null, // Minutes
  });
}

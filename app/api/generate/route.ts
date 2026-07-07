import { NextRequest, NextResponse } from "next/server";
import { generateEmail } from "@/lib/claude";
import { log } from "@/lib/logger";
import type { ProspectInput, Signal } from "@/types";

const SCORE_THRESHOLD = 6;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prospect: ProspectInput = body?.prospect;
    const signals: Signal[] = body?.signals ?? (body?.signal ? [body.signal] : []);
    const senderCompany: string = body?.senderCompany?.trim() ?? "";
    const senderName: string = body?.senderName?.trim() ?? "";
    const defaultCtaUrl: string = body?.defaultCtaUrl?.trim() ?? "";

    if (!prospect?.name?.trim() || !prospect?.company?.trim()) {
      return NextResponse.json(
        { error: "prospect.name and prospect.company are required" },
        { status: 400 }
      );
    }

    log(
      `Claude call start: prospect="${prospect.name}" company="${prospect.company}" signals="${signals.map((s) => s.title).join(", ") || "none"}" sender="${senderCompany}"`
    );

    const result = await generateEmail(prospect, signals, { senderCompany, senderName, defaultCtaUrl });

    // Log all three scores and surface a warning if any are below threshold
    const { personalization, clarity, cta } = result.scores;
    const lowDims = (
      [
        ["personalization", personalization],
        ["clarity", clarity],
        ["cta", cta],
      ] as [string, number][]
    )
      .filter(([, v]) => v < SCORE_THRESHOLD)
      .map(([k]) => k);

    if (lowDims.length > 0) {
      log(
        `Quality scores: personalization=${personalization} clarity=${clarity} cta=${cta} — LOW on: ${lowDims.join(", ")}`
      );
    } else {
      log(
        `Quality scores: personalization=${personalization} clarity=${clarity} cta=${cta}`
      );
    }

    return NextResponse.json({ result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Generate error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

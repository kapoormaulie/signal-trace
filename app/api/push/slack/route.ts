import { NextRequest, NextResponse } from "next/server";
import { postToSlack } from "@/lib/slack";
import { log } from "@/lib/logger";
import type { QualityScores } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prospectName: string = body?.prospectName;
    const company: string = body?.company;
    const signalUsed: string = body?.signalUsed ?? "";
    const scores: QualityScores = body?.scores;
    const lpUrl: string = body?.lpUrl;

    if (!prospectName || !company) {
      return NextResponse.json(
        { success: false, error: "prospectName and company are required" },
        { status: 400 }
      );
    }

    await postToSlack({ prospectName, company, signalUsed, scores, lpUrl });

    log(`Slack push success: ${prospectName} @ ${company}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Slack push error: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { postToCrmWebhook } from "@/lib/crm";
import { log } from "@/lib/logger";
import type { QualityScores } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prospectName: string = body?.prospectName;
    const company: string = body?.company;
    const email: string | undefined = body?.email || undefined;
    const title: string | undefined = body?.title || undefined;
    const linkedinUrl: string | undefined = body?.linkedinUrl || undefined;
    const subjectLine: string = body?.subjectLine ?? "";
    const emailBody: string = body?.emailBody ?? "";
    const signalUsed: string = body?.signalUsed ?? "";
    const scores: QualityScores = body?.scores;
    const lpUrl: string = body?.lpUrl;
    const webhookUrl: string | undefined = body?.webhookUrl || undefined;

    if (!prospectName || !company) {
      return NextResponse.json(
        { success: false, error: "prospectName and company are required" },
        { status: 400 }
      );
    }
    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: "No CRM webhook configured" }, { status: 400 });
    }

    await postToCrmWebhook(
      { prospectName, company, email, title, linkedinUrl, subjectLine, emailBody, signalUsed, scores, lpUrl, pushedAt: new Date().toISOString() },
      webhookUrl
    );

    log(`CRM webhook push success: ${prospectName} @ ${company}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`CRM webhook push error: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

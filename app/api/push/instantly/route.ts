import { NextRequest, NextResponse } from "next/server";
import { addLeadToCampaign } from "@/lib/instantly";
import { log } from "@/lib/logger";
import type { ProspectInput } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prospect: ProspectInput = body?.prospect;
    const emailBody: string = body?.emailBody;
    const subjectLine: string = body?.subjectLine;
    const lpUrl: string = body?.lpUrl;

    if (!prospect?.email) {
      return NextResponse.json(
        { success: false, error: "prospect.email is required to push to Instantly" },
        { status: 400 }
      );
    }
    if (!prospect?.name || !prospect?.company) {
      return NextResponse.json(
        { success: false, error: "prospect.name and company are required" },
        { status: 400 }
      );
    }

    const nameParts = prospect.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    await addLeadToCampaign({
      email: prospect.email,
      firstName,
      lastName,
      companyName: prospect.company,
      customVariables: {
        email_body: emailBody ?? "",
        subject_line: subjectLine ?? "",
        lp_url: lpUrl ?? "",
      },
    });

    log(`Instantly push success: ${prospect.name} <${prospect.email}> @ ${prospect.company}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Instantly push error: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

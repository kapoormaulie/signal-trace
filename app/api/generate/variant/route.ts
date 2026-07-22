import { NextRequest, NextResponse } from "next/server";
import { generateEmailVariant } from "@/lib/claude";
import { log } from "@/lib/logger";
import type { ProspectInput, Signal } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prospect: ProspectInput = body?.prospect;
    const signals: Signal[] = body?.signals ?? [];
    const senderCompany: string = body?.senderCompany?.trim() ?? "";
    const senderName: string = body?.senderName?.trim() ?? "";
    const defaultCtaUrl: string = body?.defaultCtaUrl?.trim() ?? "";
    const previousBody: string = body?.previousBody ?? "";

    if (!prospect?.name?.trim() || !prospect?.company?.trim()) {
      return NextResponse.json(
        { error: "prospect.name and prospect.company are required" },
        { status: 400 }
      );
    }
    if (!previousBody.trim()) {
      return NextResponse.json({ error: "previousBody is required" }, { status: 400 });
    }

    log(`Variant call start: prospect="${prospect.name}" company="${prospect.company}"`);

    const emailBody = await generateEmailVariant(
      prospect,
      signals,
      { senderCompany, senderName, defaultCtaUrl },
      previousBody
    );

    return NextResponse.json({ emailBody });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Generate variant error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

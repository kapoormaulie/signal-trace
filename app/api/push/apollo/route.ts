import { NextRequest, NextResponse } from "next/server";
import { matchPersonInApollo, addContactToApollo, addContactToSequence } from "@/lib/apollo";
import { findEmailViaHunter } from "@/lib/hunter";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prospect = body?.prospect;
  const apolloApiKey: string | undefined = body?.apolloApiKey || undefined;

  if (!prospect?.name || !prospect?.company) {
    return NextResponse.json({ error: "prospect name and company are required" }, { status: 400 });
  }

  const [firstName, ...rest] = (prospect.name as string).trim().split(" ");
  const lastName = rest.join(" ") || "-";

  log(`push/apollo | ${prospect.name} @ ${prospect.company}`);

  try {
    // If no email provided, try Hunter.io first (purpose-built), then Apollo's people/match
    let email: string | undefined = prospect.email;
    if (!email) {
      const hunterEmail = await findEmailViaHunter(firstName, lastName, prospect.company).catch(() => null);
      if (hunterEmail) {
        email = hunterEmail;
        log(`push/apollo | email found via Hunter: ${email}`);
      } else {
        const matched = await matchPersonInApollo(firstName, lastName, prospect.company, prospect.linkedinUrl, apolloApiKey).catch(() => null);
        if (matched?.email) {
          email = matched.email;
          log(`push/apollo | email found via Apollo match: ${email}`);
        }
      }
    }

    const contactId = await addContactToApollo({
      firstName,
      lastName,
      email,
      companyName: prospect.company,
      title: prospect.title,
      linkedinUrl: prospect.linkedinUrl,
    }, apolloApiKey);

    // Enroll in sequence if APOLLO_SEQUENCE_ID is set
    const sequenceId = process.env.APOLLO_SEQUENCE_ID;
    if (sequenceId && contactId) {
      await addContactToSequence(contactId, sequenceId, apolloApiKey).catch((err) => {
        log(`push/apollo | sequence enroll failed (non-fatal): ${err.message}`);
      });
    }

    log(`push/apollo | success: ${prospect.name} contactId=${contactId}`);
    return NextResponse.json({ success: true, contactId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`push/apollo | error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

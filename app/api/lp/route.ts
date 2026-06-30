import { NextRequest, NextResponse } from "next/server";
import { saveLp, getLp } from "@/lib/redis";
import { makeSlug } from "@/lib/slugify";
import { log } from "@/lib/logger";
import type { LandingPageContent } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content: LandingPageContent = body?.content;

    if (!content?.headline) {
      return NextResponse.json({ error: "content.headline is required" }, { status: 400 });
    }

    // If a slug is passed (LP update/upsert), use it. Otherwise generate one.
    const slug: string =
      body?.slug ?? makeSlug(body?.prospectName ?? "prospect", body?.company ?? "co");

    await saveLp(slug, content);
    const origin = req.headers.get("origin") ?? req.headers.get("x-forwarded-proto")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}`
      : `http://${req.headers.get("host") ?? "localhost:3000"}`;
    const url = `${origin}/lp/${slug}`;
    log(`LP saved: slug=${slug} url=${url}`);
    return NextResponse.json({ slug, url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`LP POST error: ${msg}`);
    return NextResponse.json({ error: "Failed to save LP" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const content = await getLp(slug);
    if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`LP GET error: ${msg}`);
    return NextResponse.json({ error: "Failed to load LP" }, { status: 500 });
  }
}

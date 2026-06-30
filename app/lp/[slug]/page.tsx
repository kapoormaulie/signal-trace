import { notFound } from "next/navigation";
import { getLp, appendLpVisit } from "@/lib/redis";
import { log } from "@/lib/logger";
import LpPage from "./LpPage";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LandingPageRoute({ params }: Props) {
  const { slug } = await params;

  const content = await getLp(slug);
  if (!content) notFound();

  const visitedAt = new Date().toISOString();
  appendLpVisit(slug, visitedAt).catch((err) =>
    log(`LP visit log failed: slug=${slug} err=${err instanceof Error ? err.message : String(err)}`)
  );
  log(`LP visit: slug=${slug} at ${visitedAt}`);

  return <LpPage content={content} />;
}

import { notFound } from "next/navigation";
import { getLp, appendLpVisit } from "@/lib/redis";
import { log } from "@/lib/logger";

// Every request must hit the server so the visit is logged — no static cache
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params;

  const content = await getLp(slug);
  if (!content) notFound();

  // Log the visit — fire-and-forget; don't block render on error
  const visitedAt = new Date().toISOString();
  appendLpVisit(slug, visitedAt).catch((err) =>
    log(`LP visit log failed: slug=${slug} err=${err instanceof Error ? err.message : String(err)}`)
  );
  log(`LP visit: slug=${slug} at ${visitedAt}`);

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-4xl font-bold tracking-tight leading-tight">
          {content.headline}
        </h1>

        {content.subheadline && (
          <p className="text-xl text-slate-300">{content.subheadline}</p>
        )}

        <div className="text-slate-400 leading-relaxed whitespace-pre-wrap">
          {content.body}
        </div>

        {content.ctaText && (
          <a
            href={content.ctaUrl ?? "#"}
            className="inline-block mt-4 px-8 py-3 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors"
          >
            {content.ctaText}
          </a>
        )}
      </div>
    </main>
  );
}

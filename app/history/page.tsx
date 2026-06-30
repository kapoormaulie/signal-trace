"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import EcgLoader from "@/components/EcgLoader";
import HistoryTable from "@/components/HistoryTable";
import type { ProspectRecord } from "@/types";

export default function HistoryPage() {
  const [prospects, setProspects] = useState<ProspectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setProspects(d.prospects ?? []))
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
          >
            ← New prospect
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink tracking-tight">Prospect history</h1>
          <p className="text-xs text-ink-3 mt-0.5">
            All contacts with LP visit tracking. Red rows = no LP opens after 7 days.
          </p>
        </div>

        {loading && <EcgLoader label="Loading history…" />}

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-[rgba(239,68,68,0.06)] px-4 py-3 text-sm text-red-500 font-medium">
            {error}
          </div>
        )}

        {!loading && !error && <HistoryTable prospects={prospects} />}
      </main>
    </div>
  );
}

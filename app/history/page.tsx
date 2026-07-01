"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import EcgLoader from "@/components/EcgLoader";
import HistoryTable from "@/components/HistoryTable";
import { toCsv, downloadCsv } from "@/lib/csv";
import { getDeviceId } from "@/lib/deviceId";
import { useAuth } from "@/hooks/useAuth";
import type { ProspectRecord } from "@/types";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [prospects, setProspects] = useState<ProspectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const scopeId = user?.id ?? getDeviceId();
    fetch(`/api/history?scopeId=${encodeURIComponent(scopeId)}`)
      .then((r) => r.json())
      .then((d) => setProspects(d.prospects ?? []))
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

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
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink tracking-tight">Prospect history</h1>
            <p className="text-xs text-ink-3 mt-0.5">
              All contacts with LP visit tracking. Red rows = no LP opens after 7 days.
              {" "}{user ? `Synced to ${user.email}.` : "Stored on this device only — log in to sync across devices."}
            </p>
          </div>
          {prospects.length > 0 && (
            <button
              onClick={() => {
                const csv = toCsv(
                  prospects.map((p) => ({
                    Name: p.name,
                    Company: p.company,
                    Email: p.email ?? "",
                    "Subject line": p.subjectLine,
                    "Signal used": p.signalUsed ?? "",
                    Personalization: p.scores.personalization,
                    Clarity: p.scores.clarity,
                    CTA: p.scores.cta,
                    "Landing page": p.lpUrl,
                    "LP visits": p.lpVisits.length,
                    "Contacted at": p.contactedAt,
                    Pushed: p.pushed ? "yes" : "no",
                  }))
                );
                downloadCsv(`prospect-history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
              }}
              className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-500 border border-[var(--input-border)] hover:border-brand-300 rounded-lg px-3 py-1.5 transition-all"
            >
              ⬇ Export CSV
            </button>
          )}
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

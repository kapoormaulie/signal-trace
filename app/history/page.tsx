"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import EcgLoader from "@/components/EcgLoader";
import HistoryTable from "@/components/HistoryTable";
import { toCsv, downloadCsv } from "@/lib/csv";
import { getDeviceId } from "@/lib/deviceId";
import { useAuth } from "@/hooks/useAuth";
import type { ProspectRecord, ReplyStatus } from "@/types";

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

  function handleUpdateReply(id: string, status: ReplyStatus | null) {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, replyStatus: status ?? undefined } : p)));
    fetch("/api/history", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, replyStatus: status }),
    }).catch(() => {});
  }

  const tagged = prospects.filter((p) => p.replyStatus);
  const positive = prospects.filter((p) => p.replyStatus === "positive");
  const positiveReplyRate = prospects.length > 0 ? Math.round((positive.length / prospects.length) * 100) : 0;

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
                    Reply: p.replyStatus ?? "",
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

        {!loading && !error && prospects.length > 0 && (
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3">
            <div>
              <p className="text-lg font-bold text-ink tabular-nums">{positiveReplyRate}%</p>
              <p className="text-[11px] text-ink-3">positive reply rate</p>
            </div>
            <div className="w-px h-8 bg-[var(--mist)]" />
            <p className="text-xs text-ink-3">
              <span className="text-ink font-semibold">{positive.length}</span> positive ·{" "}
              <span className="text-ink font-semibold">{tagged.length}</span> tagged ·{" "}
              <span className="text-ink font-semibold">{prospects.length}</span> contacted
            </p>
          </div>
        )}

        {loading && <EcgLoader label="Loading history…" />}

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-[rgba(239,68,68,0.06)] px-4 py-3 text-sm text-red-500 font-medium">
            {error}
          </div>
        )}

        {!loading && !error && <HistoryTable prospects={prospects} onUpdateReply={handleUpdateReply} />}
      </main>
    </div>
  );
}

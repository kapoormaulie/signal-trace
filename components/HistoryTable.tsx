"use client";

import type { ProspectRecord } from "@/types";

interface Props {
  prospects: ProspectRecord[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isUnopened(p: ProspectRecord): boolean {
  return p.lpVisits.length === 0 && Date.now() - new Date(p.contactedAt).getTime() > SEVEN_DAYS_MS;
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 8
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : score >= 6
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-red-50 text-red-600 border border-red-200";
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${cls}`}>
      {score}
    </span>
  );
}

export default function HistoryTable({ prospects }: Props) {
  if (prospects.length === 0) {
    return (
      <div className="rounded-2xl border border-mist bg-[var(--surface)] shadow-card py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path d="M4 16 L10 16 L12.5 11 L15.5 21.5 L20 4.5 L24.5 23 L27 16 L29 16" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-ink mb-1">No prospects yet</p>
        <p className="text-xs text-ink-3">Push your first lead from the main page.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-mist bg-[var(--surface)] shadow-card overflow-hidden animate-fade-up">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-mist bg-[var(--input-bg)]">
            {["Prospect", "Subject used", "Scores", "LP status", "Date", ""].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prospects.map((p, idx) => {
            const unopened = isUnopened(p);
            return (
              <tr
                key={p.id}
                className={`border-b border-mist/60 transition-colors ${
                  idx % 2 === 1 ? "bg-[var(--input-bg)]" : "bg-[var(--surface)]"
                } ${unopened ? "!bg-red-50/60" : ""} hover:bg-brand-50/40`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink text-sm">{p.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{p.company}</p>
                  {p.email && (
                    <p className="text-xs text-ink-4 truncate max-w-[180px]">{p.email}</p>
                  )}
                </td>

                <td className="px-4 py-3 max-w-[220px]">
                  <p className="text-ink-2 text-xs leading-snug truncate">
                    {p.subjectLine || "—"}
                  </p>
                  {p.signalUsed && (
                    <p className="text-[11px] text-ink-4 mt-0.5 truncate">↳ {p.signalUsed}</p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <ScorePill score={p.scores.personalization} />
                    <ScorePill score={p.scores.clarity} />
                    <ScorePill score={p.scores.cta} />
                  </div>
                </td>

                <td className="px-4 py-3">
                  {unopened ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      Not opened · 7d+
                    </span>
                  ) : p.lpVisits.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {p.lpVisits.length} visit{p.lpVisits.length !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-4">No visits yet</span>
                  )}
                </td>

                <td className="px-4 py-3 text-xs text-ink-3 whitespace-nowrap">
                  {relativeDate(p.contactedAt)}
                </td>

                <td className="px-4 py-3">
                  <a
                    href={p.lpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors whitespace-nowrap"
                  >
                    View LP ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

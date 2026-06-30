"use client";

import { useState } from "react";
import Link from "next/link";
import type { QualityScores } from "@/types";

type RowStatus = "queued" | "processing" | "done" | "error";

interface BulkRow {
  company: string;
  status: RowStatus;
  personName?: string;
  personTitle?: string;
  subjectLine?: string;
  emailBody?: string;
  lpUrl?: string;
  scores?: QualityScores;
  apolloContactId?: string;
  enrolledInSequence?: boolean;
  error?: string;
}

function StatusBadge({ status }: { status: RowStatus }) {
  const map = {
    queued:     "bg-slate-700 text-slate-400",
    processing: "bg-sky-900/60 text-sky-300 animate-pulse",
    done:       "bg-emerald-900/50 text-emerald-300",
    error:      "bg-red-900/50 text-red-300",
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${map[status]}`}>
      {status === "processing" ? "Generating…" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls = score >= 8 ? "text-emerald-400" : score >= 6 ? "text-amber-400" : "text-red-400";
  return <span className={`text-xs font-semibold ${cls}`}>{score}</span>;
}

export default function BulkPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  function patchRow(company: string, patch: Partial<BulkRow>) {
    setRows((prev) =>
      prev.map((r) => (r.company === company ? { ...r, ...patch } : r))
    );
  }

  async function handleRun() {
    const companies = input
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (companies.length === 0) return;

    const initial: BulkRow[] = companies.map((c) => ({ company: c, status: "queued" }));
    setRows(initial);
    setRunning(true);

    for (const company of companies) {
      patchRow(company, { status: "processing" });
      try {
        const res = await fetch("/api/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company }),
        });
        const data = await res.json();

        if (!res.ok) {
          patchRow(company, { status: "error", error: data.error ?? "Unknown error" });
        } else {
          patchRow(company, {
            status: "done",
            personName: data.person?.name,
            personTitle: data.person?.title,
            subjectLine: data.subjectLine,
            emailBody: data.emailBody,
            lpUrl: data.lpUrl,
            scores: data.scores,
            apolloContactId: data.apolloContactId,
            enrolledInSequence: data.enrolledInSequence,
          });
        }
      } catch {
        patchRow(company, { status: "error", error: "Network error" });
      }
    }

    setRunning(false);
  }

  const done = rows.filter((r) => r.status === "done").length;
  const errors = rows.filter((r) => r.status === "error").length;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bulk Generate</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Paste company names — SignalTrace finds the top person, generates a personalized email, and pushes to Apollo for each one.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Single
          </Link>
          <Link href="/history" className="text-sm text-slate-400 hover:text-white transition-colors">
            History →
          </Link>
        </div>
      </header>

      {/* Input */}
      {rows.length === 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Company names — one per line
            </label>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors resize-none font-mono"
              rows={10}
              placeholder={"Stripe\nNotion\nLinear\nVercel\nOpenAI"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              {input.split("\n").filter((l) => l.trim()).length} companies queued
            </p>
            <button
              onClick={handleRun}
              disabled={!input.trim()}
              className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate all →
            </button>
          </div>
        </div>
      )}

      {/* Progress summary */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">{rows.length} companies</span>
            <span className="text-emerald-400">{done} done</span>
            {errors > 0 && <span className="text-red-400">{errors} failed</span>}
            {running && (
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-3 h-3 border border-sky-500 border-t-transparent rounded-full animate-spin" />
                Processing…
              </span>
            )}
          </div>
          {!running && (
            <button
              onClick={() => { setRows([]); setInput(""); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Start over
            </button>
          )}
        </div>
      )}

      {/* Results table */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/60">
                {["Company", "Person found", "Subject line", "Scores P/C/CTA", "Apollo", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <>
                  <tr
                    key={row.company}
                    className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={row.status} />
                        <span className="text-white font-medium">{row.company}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {row.personName ? (
                        <div>
                          <p className="text-slate-200 text-xs font-medium">{row.personName}</p>
                          <p className="text-slate-500 text-[11px]">{row.personTitle}</p>
                        </div>
                      ) : row.status === "error" ? (
                        <p className="text-red-400 text-xs">{row.error}</p>
                      ) : (
                        <p className="text-slate-600 text-xs">—</p>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="text-slate-300 text-xs truncate">{row.subjectLine ?? "—"}</p>
                    </td>

                    <td className="px-4 py-3">
                      {row.scores ? (
                        <div className="flex items-center gap-1.5">
                          <ScorePill score={row.scores.personalization} />
                          <span className="text-slate-700">/</span>
                          <ScorePill score={row.scores.clarity} />
                          <span className="text-slate-700">/</span>
                          <ScorePill score={row.scores.cta} />
                        </div>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.apolloContactId ? (
                        <span className="text-[11px] text-emerald-400">
                          {row.enrolledInSequence ? "✓ In sequence" : "✓ Contact added"}
                        </span>
                      ) : row.status === "done" ? (
                        <span className="text-[11px] text-amber-400">No email — skipped</span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.status === "done" && (
                        <button
                          onClick={() => setExpandedRow(expandedRow === row.company ? null : row.company)}
                          className="text-xs text-sky-500 hover:text-sky-400 transition-colors whitespace-nowrap"
                        >
                          {expandedRow === row.company ? "Hide" : "View email"}
                        </button>
                      )}
                      {row.lpUrl && (
                        <a
                          href={row.lpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          LP →
                        </a>
                      )}
                    </td>
                  </tr>

                  {/* Expanded email preview */}
                  {expandedRow === row.company && row.emailBody && (
                    <tr key={`${row.company}-expanded`} className="border-b border-slate-800 bg-slate-900/60">
                      <td colSpan={6} className="px-4 py-4">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                          Email body
                        </p>
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-900 border border-slate-800 rounded-lg p-4">
                          {row.emailBody}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

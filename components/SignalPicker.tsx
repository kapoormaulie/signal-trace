"use client";

import { useState } from "react";
import type { Signal } from "@/types";

interface Props {
  signals: Signal[];
  noSignals: boolean;
  onSelect: (signal: Signal | null) => void;
  loading: boolean;
}

function relativeDate(iso?: string): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function SignalPicker({ signals, noSignals, onSelect, loading }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  if (noSignals) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-[var(--surface)] p-5 text-sm animate-fade-up">
        <p className="text-amber-500 font-semibold mb-1">No live signals found</p>
        <p className="text-amber-500/70 text-xs mb-4 leading-relaxed">
          Exa found no recent news for this company. The email will be personalised by company context only.
        </p>
        <button
          onClick={() => onSelect(null)}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50"
        >
          Generate without signal
        </button>
      </div>
    );
  }

  const company = signals.filter((s) => s.type === "company");
  const person  = signals.filter((s) => s.type === "person");
  const selectedSignal = signals.find((s) => s.id === selected) ?? null;

  return (
    <div className="space-y-5 animate-fade-up">
      {person.length > 0 && (
        <Section title="Person signals" badge="person" signals={person} selected={selected} onSelect={setSelected} />
      )}
      <Section title="Company signals" badge="company" signals={company} selected={selected} onSelect={setSelected} />

      <div className="flex items-center gap-3 pt-1 border-t border-mist">
        <button
          onClick={() => onSelect(selectedSignal)}
          disabled={!selected || loading}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? "Generating…" : "Use this signal →"}
        </button>
        <button
          onClick={() => onSelect(null)}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl border border-mist text-ink-2 hover:border-brand-300 hover:text-brand-600 text-sm font-medium transition-all disabled:opacity-50"
        >
          Skip — write without signal
        </button>
      </div>
    </div>
  );
}

function Section({
  title, badge, signals, selected, onSelect,
}: {
  title: string;
  badge: "company" | "person";
  signals: Signal[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const badgeCls =
    badge === "person"
      ? "bg-[var(--surface)] text-violet-500 border border-violet-300/60"
      : "bg-[var(--surface)] text-brand-500 border border-brand-300/60";

  return (
    <div>
      <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2.5">
        {title}
      </h3>
      <div className="space-y-2">
        {signals.map((sig) => {
          const isSelected = selected === sig.id;
          return (
            <button
              key={sig.id}
              onClick={() => onSelect(sig.id)}
              className={`w-full text-left rounded-xl border p-4 transition-all card-lift ${
                isSelected
                  ? "border-brand-400 bg-[rgba(79,70,229,0.1)] shadow-signal-sm"
                  : "border-mist bg-[var(--surface)] shadow-card hover:border-brand-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <span className={`text-sm font-semibold leading-snug ${isSelected ? "text-brand-400" : "text-ink"}`}>
                  {sig.title}
                </span>
                <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeCls}`}>
                  {badge}
                </span>
              </div>
              <p className="text-xs text-ink-3 leading-relaxed line-clamp-3">
                {sig.summary}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {sig.publishedDate && (
                  <span className="text-[11px] text-ink-4">{relativeDate(sig.publishedDate)}</span>
                )}
                <a
                  href={sig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] text-brand-500 hover:text-brand-700 truncate max-w-[260px] transition-colors"
                >
                  {sig.url.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

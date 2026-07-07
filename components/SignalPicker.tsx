"use client";

import { useState } from "react";
import type { Signal } from "@/types";

interface Props {
  signals: Signal[];
  noSignals: boolean;
  onSelect: (signals: Signal[]) => void;
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
  const [selected, setSelected] = useState<string[]>([]);

  if (noSignals) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-[var(--surface)] p-5 text-sm animate-fade-up">
        <p className="text-amber-500 font-semibold mb-1">No live signals found</p>
        <p className="text-amber-500/70 text-xs mb-4 leading-relaxed">
          Exa found no recent news for this company. The email will be personalised by company context only.
        </p>
        <button
          onClick={() => onSelect([])}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50"
        >
          Generate without signal
        </button>
      </div>
    );
  }

  const logo    = signals.filter((s) => s.type === "logo");
  const company = signals.filter((s) => s.type === "company");
  const person  = signals.filter((s) => s.type === "person");
  const selectedSignals = signals.filter((s) => selected.includes(s.id));
  const canAddMore = selected.length < 3;

  const toggleSignal = (signalId: string) => {
    setSelected((prev) => {
      if (prev.includes(signalId)) {
        return prev.filter((id) => id !== signalId);
      }
      if (prev.length < 3) {
        return [...prev, signalId];
      }
      return prev;
    });
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="text-xs text-ink-3 mb-3">
        Selected: <span className="text-brand-500 font-semibold">{selected.length}/3 signals</span>
      </div>

      {logo.length > 0 && (
        <Section title="Logo signals" badge="logo" signals={logo} selected={selected} onSelect={toggleSignal} canAddMore={canAddMore} />
      )}
      {person.length > 0 && (
        <Section title="Person signals" badge="person" signals={person} selected={selected} onSelect={toggleSignal} canAddMore={canAddMore} />
      )}
      <Section title="Company signals" badge="company" signals={company} selected={selected} onSelect={toggleSignal} canAddMore={canAddMore} />

      <div className="flex items-center gap-3 pt-1 border-t border-mist">
        <button
          onClick={() => onSelect(selectedSignals)}
          disabled={selected.length === 0 || loading}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? "Generating…" : `Use ${selected.length} signal${selected.length === 1 ? "" : "s"} →`}
        </button>
        <button
          onClick={() => onSelect([])}
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
  title, badge, signals, selected, onSelect, canAddMore,
}: {
  title: string;
  badge: "company" | "person" | "logo";
  signals: Signal[];
  selected: string[];
  onSelect: (id: string) => void;
  canAddMore: boolean;
}) {
  const badgeCls =
    badge === "person"
      ? "bg-[var(--surface)] text-violet-500 border border-violet-300/60"
      : badge === "logo"
        ? "bg-[var(--surface)] text-amber-500 border border-amber-300/60"
        : "bg-[var(--surface)] text-brand-500 border border-brand-300/60";

  return (
    <div>
      <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2.5">
        {title}
      </h3>
      <div className="space-y-2">
        {signals.map((sig) => {
          const isSelected = selected.includes(sig.id);
          const isLogo = sig.type === "logo";
          const isDisabled = !isSelected && !canAddMore;
          return (
            <button
              key={sig.id}
              onClick={() => !isDisabled && onSelect(sig.id)}
              disabled={isDisabled}
              className={`w-full text-left rounded-xl border p-4 transition-all card-lift ${
                isSelected
                  ? isLogo
                    ? "border-amber-400 bg-[rgba(251,191,36,0.1)] shadow-signal-sm"
                    : "border-brand-400 bg-[rgba(79,70,229,0.1)] shadow-signal-sm"
                  : isDisabled
                    ? "border-mist bg-[var(--surface)] shadow-card opacity-50 cursor-not-allowed"
                    : "border-mist bg-[var(--surface)] shadow-card hover:border-brand-300"
              }`}
            >
              {isLogo && sig.logoUrl && (
                <div className="mb-4 flex items-start justify-between gap-4">
                  <img
                    src={sig.logoUrl}
                    alt="Company logo"
                    className="h-24 w-24 rounded-lg bg-[var(--ice)] object-contain p-2 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    {sig.isRebrand && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-600 w-fit">
                        🔄 Rebrand
                      </span>
                    )}
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/20 px-2 py-1 text-[10px] font-semibold text-brand-400 w-fit">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <span
                  className={`text-sm font-semibold leading-snug ${
                    isSelected
                      ? isLogo
                        ? "text-amber-400"
                        : "text-brand-400"
                      : "text-ink"
                  }`}
                >
                  {sig.title}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeCls}`}>
                    {badge}
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink-3 leading-relaxed line-clamp-3">
                {sig.summary}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {sig.publishedDate && (
                  <span className="text-[11px] text-ink-4">{relativeDate(sig.publishedDate)}</span>
                )}
                {sig.designTrend && (
                  <span className="text-[11px] text-ink-4">Design: {sig.designTrend}</span>
                )}
                {sig.url && !isLogo && (
                  <a
                    href={sig.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] text-brand-500 hover:text-brand-400 truncate max-w-[260px] transition-colors"
                  >
                    {sig.url.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

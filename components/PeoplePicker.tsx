"use client";

import type { PersonResult } from "@/types";

interface Props {
  company: string;
  people: PersonResult[];
  onSelect: (person: PersonResult) => void;
  onBack: () => void;
}

export default function PeoplePicker({ company, people, onSelect, onBack }: Props) {
  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-[var(--surface)] p-6 text-sm animate-fade-up">
        <p className="text-amber-500 font-semibold mb-1">No people found at {company}</p>
        <p className="text-amber-500/70 mb-4 text-xs leading-relaxed">
          Exa couldn&apos;t find LinkedIn profiles for this company. Try entering the prospect manually.
        </p>
        <button
          onClick={onBack}
          className="text-xs text-ink-2 hover:text-ink transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-2">
          Found{" "}
          <span className="text-ink font-semibold">{people.length} people</span>{" "}
          at <span className="text-ink font-semibold">{company}</span> — pick one to target:
        </p>
        <button
          onClick={onBack}
          className="text-xs text-ink-3 hover:text-ink transition-colors"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="card-lift text-left rounded-2xl border border-mist bg-[var(--surface)] p-4 transition-all group shadow-card hover:border-brand-300"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors leading-snug">
                  {p.name}
                </p>
                <p className="text-xs text-ink-3 mt-0.5 leading-snug">{p.title}</p>
                {p.email ? (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <p className="text-[11px] text-emerald-600 font-medium">{p.email}</p>
                    {p.emailVerified ? (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] text-emerald-600 border border-emerald-400/30">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[rgba(251,191,36,0.1)] text-amber-500 border border-amber-400/30">
                        Unverified
                      </span>
                    )}
                    {typeof p.emailConfidence === "number" && (
                      <span className="text-[10px] text-ink-4">{p.emailConfidence}%</span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-4 mt-1">email not found</p>
                )}
              </div>
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.08)] text-brand-500 border border-brand-300/30">
                LinkedIn
              </span>
            </div>
            <p className="text-xs text-ink-3 leading-relaxed line-clamp-3 mt-1">
              {p.summary}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

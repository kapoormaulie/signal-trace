"use client";

import type { SubjectLine } from "@/types";

interface Props {
  subjects: SubjectLine[];
  selected: number;
  onSelect: (index: number) => void;
}

export default function SubjectLineVariants({ subjects, selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {subjects.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all card-lift ${
            selected === i
              ? "border-brand-400 bg-[rgba(99,102,241,0.08)] shadow-signal-sm"
              : "border-mist bg-[var(--surface)] shadow-card hover:border-brand-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                selected === i
                  ? "border-brand-600 bg-brand-600"
                  : "border-mist bg-[var(--surface)]"
              }`}
            >
              {selected === i && (
                <span className="w-2 h-2 rounded-full bg-[var(--surface)]" />
              )}
            </span>
            <div>
              <p className={`text-sm font-semibold leading-snug ${selected === i ? "text-brand-500" : "text-ink"}`}>
                {s.text}
              </p>
              <p className="text-xs text-ink-3 mt-1 leading-relaxed">{s.reasoning}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

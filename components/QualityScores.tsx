"use client";

import type { QualityScores as TQualityScores } from "@/types";

const THRESHOLD = 6;

interface Props {
  scores: TQualityScores;
}

export default function QualityScores({ scores }: Props) {
  const dims: Array<{ key: keyof TQualityScores; label: string; delay: number }> = [
    { key: "personalization", label: "Personalization", delay: 0 },
    { key: "clarity",         label: "Clarity",         delay: 100 },
    { key: "cta",             label: "CTA strength",    delay: 200 },
  ];

  return (
    <div className="space-y-3">
      {dims.map(({ key, label, delay }) => {
        const score = scores[key];
        const pct = (score / 10) * 100;
        const low = score < THRESHOLD;
        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium text-ink-2">{label}</span>
              <span
                className={`text-xs font-bold tabular-nums ${
                  low ? "text-red-500" : score >= 8 ? "text-emerald-600" : "text-amber-500"
                }`}
              >
                {score}/10{low && " ·  low"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-mist overflow-hidden">
              <div
                className={`h-full rounded-full score-bar ${
                  low ? "bg-red-400" : score >= 8 ? "bg-emerald-500" : "bg-amber-400"
                }`}
                style={{
                  width: `${pct}%`,
                  ["--bar-delay" as string]: `${delay}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

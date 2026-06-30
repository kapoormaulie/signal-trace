"use client";

import { useState } from "react";
import type { QualityScores } from "@/types";

type PushStatus = "idle" | "loading" | "success" | "error";

interface Props {
  scores: QualityScores;
  ctaUrl?: string;
  onPush: () => void;
  instantlyStatus: PushStatus;
  slackStatus: PushStatus;
  onRetryInstantly: () => void;
  onRetrySlack: () => void;
}

const THRESHOLD = 6;
const DIM_LABELS: Record<keyof QualityScores, string> = {
  personalization: "Personalization",
  clarity: "Clarity",
  cta: "CTA",
};

export default function PushButton({
  scores,
  ctaUrl,
  onPush,
  instantlyStatus,
  slackStatus,
  onRetryInstantly,
  onRetrySlack,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [ctaAcknowledged, setCtaAcknowledged] = useState(false);

  const lowDims = (Object.keys(scores) as (keyof QualityScores)[]).filter(
    (k) => scores[k] < THRESHOLD
  );
  const needsAck = lowDims.length > 0;
  const noCtaUrl = !ctaUrl?.trim();
  const canPush = (!needsAck || acknowledged) && (!noCtaUrl || ctaAcknowledged);
  const isPushing = instantlyStatus === "loading" || slackStatus === "loading";
  const hasPushed = instantlyStatus !== "idle" || slackStatus !== "idle";

  return (
    <div className="space-y-3">
      {/* CTA URL warning */}
      {noCtaUrl && !hasPushed && (
        <div className="rounded-xl border border-amber-400/40 bg-[var(--surface)] px-4 py-3">
          <p className="text-sm font-semibold text-amber-500 mb-0.5">No CTA URL on the landing page</p>
          <p className="text-xs text-amber-500/70 mb-3 leading-relaxed">
            The landing page button leads nowhere. Add a URL in the LP editor above, or continue without one.
          </p>
          <label className="flex items-center gap-2 text-sm text-amber-500 cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              checked={ctaAcknowledged}
              onChange={(e) => setCtaAcknowledged(e.target.checked)}
              className="rounded border-amber-400 text-amber-600 focus:ring-amber-300"
            />
            Continue without a CTA URL
          </label>
        </div>
      )}

      {/* Quality warning */}
      {needsAck && !hasPushed && (
        <div className="rounded-xl border border-amber-400/40 bg-[var(--surface)] px-4 py-3">
          <p className="text-sm font-semibold text-amber-500 mb-0.5">
            Low score on: {lowDims.map((k) => DIM_LABELS[k]).join(", ")}
          </p>
          <p className="text-xs text-amber-500/70 mb-3 leading-relaxed">
            One or more dimensions scored below {THRESHOLD}/10. Consider regenerating with a stronger signal.
          </p>
          <label className="flex items-center gap-2 text-sm text-amber-500 cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="rounded border-amber-400 text-amber-600 focus:ring-amber-300"
            />
            Send it anyway
          </label>
        </div>
      )}

      {/* Main push button */}
      {!hasPushed && (
        <button
          onClick={onPush}
          disabled={!canPush || isPushing}
          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isPushing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Pushing…
            </span>
          ) : (
            "Push to Apollo + Slack →"
          )}
        </button>
      )}

      {/* Per-service status */}
      {hasPushed && (
        <div className="grid grid-cols-2 gap-3">
          <ServiceRow name="Apollo" status={instantlyStatus} onRetry={onRetryInstantly} />
          <ServiceRow name="Slack"  status={slackStatus}     onRetry={onRetrySlack} />
        </div>
      )}
    </div>
  );
}

function ServiceRow({
  name,
  status,
  onRetry,
}: {
  name: string;
  status: PushStatus;
  onRetry: () => void;
}) {
  const config = {
    idle:    { text: "Pending",  cls: "text-ink-3",      dot: "bg-ink-4" },
    loading: { text: "Sending…", cls: "text-brand-600",   dot: "bg-brand-400 animate-pulse" },
    success: { text: "Sent",     cls: "text-emerald-600", dot: "bg-emerald-400" },
    error:   { text: "Failed",   cls: "text-red-500",     dot: "bg-red-400" },
  }[status];

  return (
    <div className="flex items-center justify-between rounded-xl border border-mist bg-[var(--surface)] px-3 py-2.5 shadow-card">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
        <div>
          <p className="text-xs font-semibold text-ink">{name}</p>
          <p className={`text-xs ${config.cls}`}>{config.text}</p>
        </div>
      </div>
      {status === "error" && (
        <button
          onClick={onRetry}
          className="text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-2 py-0.5 transition-colors"
        >
          Retry
        </button>
      )}
      {status === "success" && (
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 16 16">
          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

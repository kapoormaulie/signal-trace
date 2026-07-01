"use client";

import { useState } from "react";
import type { QualityScores } from "@/types";
import { toCsv, downloadCsv } from "@/lib/csv";

type PushStatus = "idle" | "loading" | "success" | "error";

interface Props {
  scores: QualityScores;
  ctaUrl?: string;
  apolloApiKey?: string;
  slackWebhookUrl?: string;
  crmWebhookUrl?: string;
  teamEmail?: string;
  onPush: () => void;
  onOpenIntegrations?: () => void;
  instantlyStatus: PushStatus;
  slackStatus: PushStatus;
  crmStatus?: PushStatus;
  onRetryInstantly: () => void;
  onRetrySlack: () => void;
  onRetryCrm?: () => void;
  // Report data — used for the CSV download + "notify team" mailto link only
  prospectName?: string;
  company?: string;
  email?: string;
  subjectLine?: string;
  emailBody?: string;
  signalUsed?: string;
  lpUrl?: string;
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
  apolloApiKey,
  slackWebhookUrl,
  crmWebhookUrl,
  teamEmail,
  onPush,
  onOpenIntegrations,
  instantlyStatus,
  slackStatus,
  crmStatus = "idle",
  onRetryInstantly,
  onRetrySlack,
  onRetryCrm,
  prospectName,
  company,
  email,
  subjectLine,
  emailBody,
  signalUsed,
  lpUrl,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [ctaAcknowledged, setCtaAcknowledged] = useState(false);

  const lowDims = (Object.keys(scores) as (keyof QualityScores)[]).filter(
    (k) => scores[k] < THRESHOLD
  );
  const needsAck = lowDims.length > 0;
  const noCtaUrl = !ctaUrl?.trim();
  const hasApollo = !!apolloApiKey?.trim();
  const hasCrm    = !!crmWebhookUrl?.trim();
  const noSlackUrl = !slackWebhookUrl?.trim();
  const noCrmTarget = !hasApollo && !hasCrm; // must fill at least one of Apollo or another CRM webhook
  const canPush = !noCrmTarget && (!needsAck || acknowledged) && (!noCtaUrl || ctaAcknowledged);
  const isPushing =
    (hasApollo && instantlyStatus === "loading") ||
    slackStatus === "loading" ||
    (hasCrm && crmStatus === "loading");
  const hasPushed =
    (hasApollo && instantlyStatus !== "idle") ||
    slackStatus !== "idle" ||
    (hasCrm && crmStatus !== "idle");

  function handleDownloadReport() {
    const csv = toCsv([
      {
        Name: prospectName ?? "",
        Company: company ?? "",
        Email: email ?? "",
        "Subject line": subjectLine ?? "",
        "Signal used": signalUsed ?? "",
        "Personalization score": scores.personalization,
        "Clarity score": scores.clarity,
        "CTA score": scores.cta,
        "Landing page": lpUrl ?? "",
        "Email body": emailBody ?? "",
        "Generated at": new Date().toISOString(),
      },
    ]);
    const safeName = (prospectName || company || "prospect").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`prospect-report-${safeName}.csv`, csv);
  }

  function handleEmailTeam() {
    const subject = `New lead: ${prospectName ?? "Prospect"} at ${company ?? ""}`;
    const bodyLines = [
      `${prospectName ?? "A prospect"} at ${company ?? ""} was just pushed via SignalTrace.`,
      signalUsed ? `Signal: ${signalUsed}` : null,
      `Scores — Personalization: ${scores.personalization}/10, Clarity: ${scores.clarity}/10, CTA: ${scores.cta}/10`,
      lpUrl ? `Landing page: ${lpUrl}` : null,
    ].filter(Boolean);
    const mailto = `mailto:${encodeURIComponent(teamEmail ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailto;
  }

  return (
    <div className="space-y-3">
      {/* Neither Apollo nor another CRM webhook configured — hard block */}
      {noCrmTarget && !hasPushed && (
        <div className="rounded-xl border border-red-400/50 bg-[rgba(239,68,68,0.06)] px-4 py-3.5">
          <div className="flex items-start gap-3">
            <svg className="shrink-0 mt-0.5 text-red-500" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-500 mb-0.5">No CRM connected</p>
              <p className="text-xs text-red-400/80 leading-relaxed mb-3">
                This lead has nowhere to go. Add your Apollo API key, or fill in a CRM webhook URL as an alternative — only one of the two is required.
              </p>
              {onOpenIntegrations && (
                <button
                  onClick={onOpenIntegrations}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-400/50 hover:border-red-400 hover:bg-[rgba(239,68,68,0.08)] rounded-lg px-3 py-1.5 transition-all"
                >
                  Set up Integrations →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slack webhook missing — soft notice + email fallback */}
      {noSlackUrl && !hasPushed && (
        <div className="rounded-xl border border-amber-400/40 bg-[rgba(251,191,36,0.05)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <svg className="shrink-0 mt-0.5 text-amber-500" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7 5.5v3M7 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="text-xs font-semibold text-amber-500">Slack not connected</p>
                <p className="text-[11px] text-amber-500/70 leading-relaxed mt-0.5">
                  Your team won&apos;t get notified when this lead is pushed.
                </p>
              </div>
            </div>
            {onOpenIntegrations && (
              <button
                onClick={onOpenIntegrations}
                className="shrink-0 text-[11px] font-semibold text-amber-500 border border-amber-400/50 hover:border-amber-400 hover:bg-[rgba(251,191,36,0.08)] rounded-lg px-2.5 py-1 transition-all whitespace-nowrap"
              >
                Add now →
              </button>
            )}
          </div>
          <button
            onClick={handleEmailTeam}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 hover:text-amber-500 transition-colors"
          >
            ✉️ Notify team via email instead
          </button>
        </div>
      )}

      {/* Already have one CRM target — low-emphasis suggestion to add the other, not required */}
      {hasApollo && !hasCrm && !hasPushed && onOpenIntegrations && (
        <button
          onClick={onOpenIntegrations}
          className="w-full text-left rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-[11px] text-ink-3 hover:text-brand-500 hover:border-brand-300 transition-all"
        >
          🔗 Also want this synced to HubSpot, Pipedrive, Salesforce, or another CRM? Connect a webhook →
        </button>
      )}

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
            `Push to ${[hasApollo && "Apollo", "Slack", hasCrm && "CRM"].filter(Boolean).join(" + ")} →`
          )}
        </button>
      )}

      {/* Per-service status */}
      {hasPushed && (
        <div className={`grid gap-3 ${hasApollo && hasCrm ? "grid-cols-3" : "grid-cols-2"}`}>
          {hasApollo && <ServiceRow name="Apollo" status={instantlyStatus} onRetry={onRetryInstantly} />}
          <ServiceRow name="Slack" status={slackStatus} onRetry={onRetrySlack} />
          {hasCrm && <ServiceRow name="CRM" status={crmStatus} onRetry={onRetryCrm ?? (() => {})} />}
        </div>
      )}

      {/* Download prospect report — always available, no integration required */}
      <button
        onClick={handleDownloadReport}
        className="w-full py-2 rounded-xl border border-[var(--input-border)] text-ink-3 hover:text-brand-500 hover:border-brand-300 text-xs font-semibold transition-all"
      >
        ⬇ Download prospect report (CSV)
      </button>
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

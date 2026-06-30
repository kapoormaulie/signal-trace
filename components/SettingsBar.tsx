"use client";

import { useState } from "react";
import type { UserSettings } from "@/hooks/useSettings";

interface Props {
  settings: UserSettings;
  onSave: (patch: Partial<UserSettings>) => void;
  isConfigured: boolean;
}

const inputCls =
  "w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all";

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
      connected
        ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-500"
        : "bg-[var(--input-bg)] border-[var(--input-border)] text-ink-4"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-ink-4"}`} />
      {connected ? "Connected" : "Not set"}
    </span>
  );
}

export default function SettingsBar({ settings, onSave, isConfigured }: Props) {
  const [open, setOpen] = useState(!isConfigured);
  const [tab, setTab] = useState<"profile" | "integrations">("profile");
  const [draft, setDraft] = useState(settings);

  if (!open && draft.senderCompany !== settings.senderCompany) {
    setDraft(settings);
  }

  function handleSave() {
    if (!draft.senderCompany.trim()) return;
    onSave(draft);
    setOpen(false);
  }

  const apolloConnected = !!(draft.apolloApiKey?.trim() || settings.apolloApiKey?.trim());
  const slackConnected  = !!(draft.slackWebhookUrl?.trim() || settings.slackWebhookUrl?.trim());

  // ── Collapsed pill ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <div className="flex items-center justify-between text-xs text-ink-3 mb-5 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            Sending as{" "}
            <span className="text-ink-2 font-medium">{settings.senderName || "you"}</span>
            {" "}·{" "}
            <span className="text-ink-2 font-medium">{settings.senderCompany}</span>
          </span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
            settings.apolloApiKey ? "border-emerald-400/25 text-emerald-500 bg-emerald-400/8" : "border-[var(--input-border)] text-ink-4"
          }`}>
            Apollo {settings.apolloApiKey ? "✓" : "—"}
          </span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
            settings.slackWebhookUrl ? "border-emerald-400/25 text-emerald-500 bg-emerald-400/8" : "border-[var(--input-border)] text-ink-4"
          }`}>
            Slack {settings.slackWebhookUrl ? "✓" : "—"}
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-brand-600 hover:text-brand-700 font-medium transition-colors ml-4 shrink-0"
        >
          Edit settings
        </button>
      </div>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl border border-[var(--input-border)] bg-[var(--surface)] p-5 mb-6 animate-fade-up"
      style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.12), 0 2px 16px rgba(79,70,229,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {isConfigured ? "Settings" : "Set up SignalTrace"}
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Saved locally in your browser — never sent to any server.
          </p>
        </div>
        {isConfigured && (
          <button
            onClick={() => setOpen(false)}
            className="text-ink-3 hover:text-ink text-xs transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[var(--input-bg)] rounded-xl p-1 w-fit border border-[var(--input-border)]">
        {(["profile", "integrations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t
                ? "bg-[var(--surface)] text-ink shadow-sm border border-[var(--input-border)]"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t === "profile" ? "Sender profile" : (
              <span className="flex items-center gap-2">
                Integrations
                {(!apolloConnected || !slackConnected) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SENDER PROFILE TAB ──────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="space-y-5">
          {/* Why it matters banner */}
          <div className="rounded-xl border border-brand-300/30 bg-[rgba(99,102,241,0.05)] px-4 py-3.5">
            <p className="text-xs font-semibold text-brand-400 mb-2">Why this makes your emails work</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "✍️", title: "Signed by you", body: "Every email is signed with your name and mentions your company — it reads as hand-written, not automated." },
                { icon: "🎯", title: "Contextual value prop", body: "The AI frames your product's value specifically for each prospect's pain — using your company as the anchor." },
                { icon: "🔗", title: "LP branded to you", body: "The landing page headline positions your company as the solution — not a generic pitch." },
              ].map((item) => (
                <div key={item.title} className="flex gap-2.5">
                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-ink-2 mb-0.5">{item.title}</p>
                    <p className="text-[11px] text-ink-4 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Your company <span className="text-brand-500">*</span>
              </label>
              <input
                className={inputCls}
                placeholder="Acme Inc"
                value={draft.senderCompany}
                onChange={(e) => setDraft((d) => ({ ...d, senderCompany: e.target.value }))}
              />
              <p className="text-[10px] text-ink-4 mt-1">Woven into every email and landing page</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Your name</label>
              <input
                className={inputCls}
                placeholder="Jane Smith"
                value={draft.senderName}
                onChange={(e) => setDraft((d) => ({ ...d, senderName: e.target.value }))}
              />
              <p className="text-[10px] text-ink-4 mt-1">Used to sign the email</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Default CTA URL</label>
              <input
                className={inputCls}
                placeholder="https://cal.com/you/20min"
                value={draft.defaultCtaUrl}
                onChange={(e) => setDraft((d) => ({ ...d, defaultCtaUrl: e.target.value }))}
              />
              <p className="text-[10px] text-ink-4 mt-1">Your calendar, demo page, or site</p>
            </div>
          </div>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ────────────────────────────────────────── */}
      {tab === "integrations" && (
        <div className="space-y-4">

          {/* Apollo */}
          <div className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[rgba(251,146,60,0.12)] border border-[rgba(251,146,60,0.2)] flex items-center justify-center text-sm">🚀</div>
                <div>
                  <p className="text-sm font-semibold text-ink">Apollo.io</p>
                  <p className="text-[11px] text-ink-4">CRM — adds contacts + enrols in sequences</p>
                </div>
              </div>
              <StatusDot connected={apolloConnected} />
            </div>

            <div className="grid grid-cols-5 gap-3 mb-3">
              {[
                { icon: "👤", text: "Creates contact in your Apollo account" },
                { icon: "📋", text: "Enrols them in your outbound sequence" },
                { icon: "📧", text: "Enriches missing email addresses" },
                { icon: "📊", text: "Tracks opens and replies in Apollo" },
                { icon: "🔄", text: "Syncs back to your existing CRM" },
              ].map((item) => (
                <div key={item.text} className="flex gap-1.5 items-start">
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <p className="text-[10px] text-ink-4 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-ink-2 mb-1.5">API Key</label>
                <input
                  className={inputCls}
                  type="password"
                  placeholder="Paste your Apollo API key…"
                  value={draft.apolloApiKey ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, apolloApiKey: e.target.value }))}
                />
              </div>
              <a
                href="https://app.apollo.io/#/settings/integrations/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand-500 hover:text-brand-400 font-medium transition-colors pb-2 whitespace-nowrap"
              >
                Get key ↗
              </a>
            </div>
            <p className="text-[10px] text-ink-4 mt-1.5">
              Settings → Integrations → API Keys in Apollo. Free tier works. Overrides the server-level key if set.
            </p>
          </div>

          {/* Slack */}
          <div className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.15)] flex items-center justify-center text-sm">💬</div>
                <div>
                  <p className="text-sm font-semibold text-ink">Slack</p>
                  <p className="text-[11px] text-ink-4">Webhook — fires a notification every time you push a lead</p>
                </div>
              </div>
              <StatusDot connected={slackConnected} />
            </div>

            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { icon: "🔔", text: "Instant push notification when a lead is sent" },
                { icon: "📈", text: "Shows quality scores (P·C·CTA) in the message" },
                { icon: "🔗", text: "Links directly to the prospect's landing page" },
                { icon: "👥", text: "Keeps your whole team in the loop on outbound" },
              ].map((item) => (
                <div key={item.text} className="flex gap-1.5 items-start">
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <p className="text-[10px] text-ink-4 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-ink-2 mb-1.5">Incoming Webhook URL</label>
                <input
                  className={inputCls}
                  type="password"
                  placeholder="https://hooks.slack.com/services/…"
                  value={draft.slackWebhookUrl ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, slackWebhookUrl: e.target.value }))}
                />
              </div>
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand-500 hover:text-brand-400 font-medium transition-colors pb-2 whitespace-nowrap"
              >
                Create webhook ↗
              </a>
            </div>
            <p className="text-[10px] text-ink-4 mt-1.5">
              api.slack.com/apps → Create App → Incoming Webhooks → Activate → Add New Webhook. Takes 2 minutes.
            </p>
          </div>

        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!draft.senderCompany.trim()}
        className="mt-5 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        Save & continue →
      </button>
    </div>
  );
}

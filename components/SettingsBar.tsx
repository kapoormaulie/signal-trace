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

export default function SettingsBar({ settings, onSave, isConfigured }: Props) {
  const [open, setOpen] = useState(!isConfigured);
  const [draft, setDraft] = useState(settings);

  if (!open && draft.senderCompany !== settings.senderCompany) {
    setDraft(settings);
  }

  function handleSave() {
    if (!draft.senderCompany.trim()) return;
    onSave(draft);
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between text-xs text-ink-3 mb-5 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          Sending as{" "}
          <span className="text-ink-2 font-medium">{settings.senderName || "you"}</span>
          {" "}·{" "}
          <span className="text-ink-2 font-medium">{settings.senderCompany}</span>
          {settings.defaultCtaUrl && (
            <span className="text-ink-4 ml-1">
              · CTA set
            </span>
          )}
        </span>
        <button
          onClick={() => setOpen(true)}
          className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          Edit settings
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--input-border)] bg-[var(--surface)] p-5 mb-6 animate-fade-up" style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.12), 0 2px 16px rgba(79,70,229,0.07)" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {isConfigured ? "Settings" : "Set up your sender profile"}
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Used to personalise every email and landing page. Saved locally.
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">
            Your company <span className="text-brand-600">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Acme Inc"
            value={draft.senderCompany}
            onChange={(e) => setDraft((d) => ({ ...d, senderCompany: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Your name</label>
          <input
            className={inputCls}
            placeholder="Jane Smith"
            value={draft.senderName}
            onChange={(e) => setDraft((d) => ({ ...d, senderName: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1.5">Default CTA URL</label>
          <input
            className={inputCls}
            placeholder="https://cal.com/you/20min"
            value={draft.defaultCtaUrl}
            onChange={(e) => setDraft((d) => ({ ...d, defaultCtaUrl: e.target.value }))}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!draft.senderCompany.trim()}
        className="mt-4 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        Save & continue →
      </button>
    </div>
  );
}

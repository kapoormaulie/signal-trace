"use client";

import { useState } from "react";
import type { LandingPageContent } from "@/types";

interface Props {
  emailBody: string;
  onEmailBodyChange: (v: string) => void;
  lpContent: LandingPageContent;
  onLpContentChange: (v: LandingPageContent) => void;
  lpUrl: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

const inputCls =
  "w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all";

export default function ReviewPanel({
  emailBody,
  onEmailBodyChange,
  lpContent,
  onLpContentChange,
  lpUrl,
  onRegenerate,
  regenerating = false,
}: Props) {
  const [mobilePanel, setMobilePanel] = useState<"email" | "lp">("email");

  function patchLp(patch: Partial<LandingPageContent>) {
    onLpContentChange({ ...lpContent, ...patch });
  }

  const words = emailBody.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">

      {/* ── Regenerate bar ───────────────────────────────────────── */}
      {onRegenerate && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔄</span>
            <div>
              <p className="text-xs font-semibold text-ink">Not happy with this email?</p>
              <p className="text-[11px] text-ink-4">Generate a completely new version using the same signal and prospect.</p>
            </div>
          </div>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl border border-[var(--input-border)] text-ink-2 hover:border-brand-400 hover:text-brand-500 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-4"
          >
            {regenerating ? (
              <>
                <span className="w-3 h-3 border-2 border-brand-300/40 border-t-brand-500 rounded-full animate-spin" />
                Regenerating…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 6A4 4 0 1 1 6 2M6 2L8.5 4.5M6 2L3.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Regenerate
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Mobile panel switcher ───────────────────────────────── */}
      <div className="flex sm:hidden gap-1 p-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] mb-1">
        {(["email", "lp"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setMobilePanel(p)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mobilePanel === p
                ? "bg-[var(--surface)] text-ink shadow-sm border border-[var(--input-border)]"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {p === "email" ? "Email body" : "Landing page"}
          </button>
        ))}
      </div>

      {/* ── Two-column editor ────────────────────────────────────── */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 transition-opacity ${regenerating ? "opacity-40 pointer-events-none" : ""}`}>

        {/* Email editor */}
        <div className={`space-y-2 ${mobilePanel === "lp" ? "hidden sm:block" : "block"}`}>
          <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em]">
            Email body
          </h3>
          <textarea
            value={emailBody}
            onChange={(e) => onEmailBodyChange(e.target.value)}
            rows={18}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 py-3 text-sm text-ink font-mono leading-relaxed focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all resize-none"
            style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px" }}
          />
          <p className="text-[11px] text-ink-4">
            {emailBody.length} chars · {words} words
          </p>
        </div>

        {/* LP editor */}
        <div className={`space-y-4 ${mobilePanel === "email" ? "hidden sm:block" : "block"}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em]">
              Landing page
            </h3>
            <a
              href={lpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors"
            >
              Preview live page ↗
            </a>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-ink-2 mb-1">Headline</label>
              <input
                className={inputCls}
                value={lpContent.headline}
                onChange={(e) => patchLp({ headline: e.target.value })}
                placeholder="Personalized headline"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-2 mb-1">Subheadline</label>
              <input
                className={inputCls}
                value={lpContent.subheadline}
                onChange={(e) => patchLp({ subheadline: e.target.value })}
                placeholder="Supporting line"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-2 mb-1">Body copy</label>
              <textarea
                className={inputCls + " resize-none"}
                value={lpContent.body}
                onChange={(e) => patchLp({ body: e.target.value })}
                rows={5}
                placeholder="3–4 sentence value proposition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-2 mb-1">CTA text</label>
                <input
                  className={inputCls}
                  value={lpContent.ctaText}
                  onChange={(e) => patchLp({ ctaText: e.target.value })}
                  placeholder="Book a 20-min call"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink-2 mb-1">CTA URL</label>
                <input
                  className={inputCls}
                  value={lpContent.ctaUrl ?? ""}
                  onChange={(e) => patchLp({ ctaUrl: e.target.value })}
                  placeholder="https://cal.com/you/20min"
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-ink-4">
            Edits here update the live page when you push.
          </p>
        </div>

      </div>
    </div>
  );
}

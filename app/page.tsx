"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import EcgLoader from "@/components/EcgLoader";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import HeroBanner from "@/components/HeroBanner";
import ProspectForm from "@/components/ProspectForm";
import SignalPicker from "@/components/SignalPicker";
import ReviewPanel from "@/components/ReviewPanel";
import QualityScores from "@/components/QualityScores";
import SubjectLineVariants from "@/components/SubjectLineVariants";
import PushButton from "@/components/PushButton";
import PeoplePicker from "@/components/PeoplePicker";
import CompanyDiscovery from "@/components/CompanyDiscovery";
import SettingsBar from "@/components/SettingsBar";
import { useSettings } from "@/hooks/useSettings";
import type {
  ProspectInput,
  Signal,
  GenerationResult,
  LandingPageContent,
  RunStage,
  PersonResult,
  QualityScores as QS,
} from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────
type PushStatus = "idle" | "loading" | "success" | "error";
type DupInfo = { id: string; name: string; company: string; contactedAt: string };
type PageTab = "single" | "bulk" | "settings";
type TargetRole = "decision-maker" | "sales" | "marketing" | "product" | "any";
type BulkRowStatus = "queued" | "processing" | "done" | "error";

interface BulkOptions {
  targetRole: TargetRole;
  autoPush: boolean;
  minScore: number;
}

interface BulkRow {
  company: string;
  status: BulkRowStatus;
  personName?: string;
  personTitle?: string;
  personEmail?: string;
  subjectLine?: string;
  emailBody?: string;
  lpUrl?: string;
  scores?: QS;
  apolloContactId?: string;
  enrolledInSequence?: boolean;
  error?: string;
  expanded?: boolean;
}

interface AppState {
  stage: RunStage;
  lookupCompany: string;
  people: PersonResult[];
  prospect: ProspectInput | null;
  signals: Signal[];
  noSignals: boolean;
  duplicate: DupInfo | null;
  dupDismissed: boolean;
  selectedSignal: Signal | null;
  generation: GenerationResult | null;
  editedEmailBody: string;
  editedLpContent: LandingPageContent | null;
  selectedSubjectIdx: number;
  lpUrl: string;
  lpSlug: string;
  instantlyStatus: PushStatus;
  slackStatus: PushStatus;
  error: string | null;
  regenerating: boolean;
}

const INITIAL: AppState = {
  stage: "idle", lookupCompany: "", people: [], prospect: null,
  signals: [], noSignals: false, duplicate: null, dupDismissed: false,
  selectedSignal: null, generation: null, editedEmailBody: "",
  editedLpContent: null, selectedSubjectIdx: 0, lpUrl: "", lpSlug: "",
  instantlyStatus: "idle", slackStatus: "idle", error: null, regenerating: false,
};

const ROLE_LABELS: Record<TargetRole, string> = {
  "decision-maker": "CEO / Founder",
  sales: "VP Sales / CRO",
  marketing: "CMO / VP Marketing",
  product: "CPO / VP Product",
  any: "Any decision-maker",
};

// ─── Shared style tokens ─────────────────────────────────────────────────────
const GLASS = "glass rounded-2xl";
const BTN_PRIMARY = "px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
const BTN_GHOST = "px-5 py-2.5 rounded-xl border border-[var(--input-border)] text-ink-2 hover:border-brand-300 hover:text-brand-600 text-sm font-medium transition-all disabled:opacity-50";
const INPUT = "w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all backdrop-blur-sm";

// ─── Helper ──────────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

// ─── TabBar ──────────────────────────────────────────────────────────────────
function TabBar({
  tab,
  onChange,
  showSettingsBadge,
}: {
  tab: PageTab;
  onChange: (t: PageTab) => void;
  showSettingsBadge?: boolean;
}) {
  const TABS: { id: PageTab; label: string }[] = [
    { id: "single",   label: "Single prospect" },
    { id: "bulk",     label: "Bulk generate"   },
    { id: "settings", label: "Set up sender profile" },
  ];

  return (
    <div className="dark-tab-tray flex gap-1 mb-6 bg-white/50 backdrop-blur-sm rounded-xl p-1 w-fit border border-[rgba(223,227,248,0.7)] shadow-sm">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            tab === id
              ? "dark-tab-active bg-white text-ink shadow-sm border border-[rgba(223,227,248,0.8)]"
              : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {label}
          {id === "settings" && showSettingsBadge && (
            <span className="text-[9px] font-bold text-white bg-amber-400 px-1.5 py-0.5 rounded-full leading-none">
              Recommended
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── EntryPanel ──────────────────────────────────────────────────────────────
function EntryPanel({
  stage,
  onCompanyLookup,
  onManualSubmit,
}: {
  stage: RunStage;
  onCompanyLookup: (company: string) => void;
  onManualSubmit: (input: ProspectInput) => void;
}) {
  const [tab, setTab] = useState<"company" | "manual">("company");
  const [companyInput, setCompanyInput] = useState("");
  const isLoading = stage === "company-lookup" || stage === "fetching-signals";

  return (
    <div className={`${GLASS} p-6 animate-fade-up card-shimmer`}>
      {/* Inner tabs */}
      <div className="dark-tab-tray flex gap-1 mb-5 bg-white/40 backdrop-blur-sm rounded-xl p-1 w-fit border border-[rgba(223,227,248,0.6)]">
        {(["company", "manual"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1 rounded-lg text-xs font-semibold transition-all ${
              tab === t ? "dark-tab-active bg-white text-ink shadow-sm border border-[rgba(223,227,248,0.7)]" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t === "company" ? "Find by company" : "Enter manually"}
          </button>
        ))}
      </div>

      {tab === "company" ? (
        <div className="space-y-3">
          <p className="text-xs text-ink-3">
            Type a company — we&apos;ll surface decision-makers for you to pick from.
          </p>
          <div className="flex gap-3">
            <input
              className={INPUT + " flex-1"}
              placeholder="Stripe, Notion, Linear…"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && companyInput.trim() && !isLoading)
                  onCompanyLookup(companyInput.trim());
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => companyInput.trim() && onCompanyLookup(companyInput.trim())}
              disabled={!companyInput.trim() || isLoading}
              className={BTN_PRIMARY}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Searching…
                </span>
              ) : "Find people →"}
            </button>
          </div>
        </div>
      ) : (
        <ProspectForm onSubmit={onManualSubmit} loading={isLoading} />
      )}
    </div>
  );
}

// ─── BulkSection ─────────────────────────────────────────────────────────────
function BulkSection({
  settings,
}: {
  settings: { senderCompany: string; senderName: string; defaultCtaUrl: string };
}) {
  const [options, setOptions] = useState<BulkOptions>({
    targetRole: "decision-maker",
    autoPush: true,
    minScore: 6,
  });
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);

  function patchRow(company: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.company === company ? { ...r, ...patch } : r)));
  }

  async function handleRun() {
    const companies = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!companies.length) return;
    setRows(companies.map((c) => ({ company: c, status: "queued" })));
    setRunning(true);
    for (const company of companies) {
      patchRow(company, { status: "processing" });
      try {
        const res = await fetch("/api/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            targetRole: options.targetRole,
            autoPush: options.autoPush,
            minScore: options.minScore,
            senderCompany: settings.senderCompany,
            senderName: settings.senderName,
            defaultCtaUrl: settings.defaultCtaUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          patchRow(company, { status: "error", error: data.error ?? "Unknown error" });
        } else {
          patchRow(company, {
            status: "done",
            personName: data.person?.name, personTitle: data.person?.title,
            personEmail: data.person?.email, subjectLine: data.subjectLine,
            emailBody: data.emailBody, lpUrl: data.lpUrl, scores: data.scores,
            apolloContactId: data.apolloContactId, enrolledInSequence: data.enrolledInSequence,
          });
        }
      } catch {
        patchRow(company, { status: "error", error: "Network error" });
      }
    }
    setRunning(false);
  }

  const done   = rows.filter((r) => r.status === "done").length;
  const errors = rows.filter((r) => r.status === "error").length;
  const total  = rows.length;

  const statusCfg: Record<BulkRowStatus, { cls: string; label: string }> = {
    queued:     { cls: "bg-ink-4/20 text-ink-3",        label: "—" },
    processing: { cls: "bg-brand-100 text-brand-600",    label: "…" },
    done:       { cls: "bg-emerald-100 text-emerald-700", label: "✓" },
    error:      { cls: "bg-red-100 text-red-600",         label: "✗" },
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {rows.length === 0 && (
        <div className={`${GLASS} p-6 space-y-6 card-shimmer`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Bulk options</h2>
            <span className="text-[11px] text-ink-4 border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-0.5 rounded-full">
              {input.split("\n").filter((l) => l.trim()).length || 0} queued
            </span>
          </div>

          {/* Target role */}
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-2.5">Who to target</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(ROLE_LABELS) as TargetRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setOptions((o) => ({ ...o, targetRole: role }))}
                  className={`text-center px-2 py-2 rounded-xl border text-xs font-medium transition-all card-lift ${
                    options.targetRole === role
                      ? "border-brand-400 bg-brand-50/80 text-brand-700 shadow-signal-sm"
                      : "border-[var(--input-border)] text-ink-3 hover:border-brand-300 hover:text-ink-2 bg-[var(--input-bg)]"
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-push + min score */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-2">Auto-push to Apollo</label>
              <button
                onClick={() => setOptions((o) => ({ ...o, autoPush: !o.autoPush }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  options.autoPush
                    ? "border-emerald-300 bg-emerald-50/80 text-emerald-700"
                    : "border-[var(--input-border)] text-ink-3 bg-[var(--input-bg)]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full transition-colors ${options.autoPush ? "bg-emerald-500" : "bg-ink-4"}`} />
                {options.autoPush ? "Enabled" : "Off — generate only"}
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-2">
                Min score to push:{" "}
                <span className="text-brand-600 font-bold">{options.minScore}/10</span>
              </label>
              <input
                type="range" min={1} max={10} value={options.minScore}
                onChange={(e) => setOptions((o) => ({ ...o, minScore: Number(e.target.value) }))}
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-[10px] text-ink-4 mt-1">
                <span>Push everything</span><span>Very strict</span>
              </div>
            </div>
          </div>

          {/* Discovery */}
          <CompanyDiscovery
            onAdd={(companies) =>
              setInput((prev) => {
                const existing = prev.split("\n").map((l) => l.trim()).filter(Boolean);
                const newOnes = companies.filter((c) => !existing.includes(c));
                return [...existing, ...newOnes].join("\n");
              })
            }
          />

          {/* Company textarea */}
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-2">Company names — one per line</label>
            <textarea
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 py-3 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all resize-none backdrop-blur-sm"
              style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
              rows={7}
              placeholder={"Stripe\nNotion\nLinear\nVercel\nOpenAI"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-4">
              {input.split("\n").filter((l) => l.trim()).length}{" "}
              {input.split("\n").filter((l) => l.trim()).length === 1 ? "company" : "companies"} queued
            </p>
            <button onClick={handleRun} disabled={!input.trim() || running} className={BTN_PRIMARY}>
              Generate all →
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-ink-2 font-medium">{total} companies</span>
              <span className="text-emerald-600 font-semibold">{done} done</span>
              {errors > 0 && <span className="text-red-500 font-semibold">{errors} failed</span>}
              {running && (
                <span className="flex items-center gap-1.5 text-brand-600 text-xs font-semibold">
                  <span className="w-3 h-3 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                  Processing…
                </span>
              )}
            </div>
            {!running && (
              <button onClick={() => setRows([])} className="text-xs text-ink-3 hover:text-ink font-medium transition-colors">
                Start over
              </button>
            )}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="h-1.5 rounded-full bg-[rgba(223,227,248,0.5)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
                style={{ width: `${((done + errors) / total) * 100}%` }}
              />
            </div>
          )}
        </>
      )}

      {/* Results table */}
      {rows.length > 0 && (
        <div className={`${GLASS} overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--input-border)] bg-[var(--input-bg)]">
                {["Company", "Person", "Subject line", "P·C·CTA", "Apollo", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const { cls, label } = statusCfg[row.status];
                return (
                  <>
                    <tr
                      key={row.company}
                      className={`border-b border-[var(--input-border)] transition-colors ${
                        idx % 2 === 1 ? "bg-transparent" : "bg-[var(--input-bg)]"
                      } hover:bg-brand-50/30`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[18px] text-center ${cls}`}>{label}</span>
                          <span className="text-ink font-semibold text-xs">{row.company}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.personName ? (
                          <div>
                            <p className="text-ink-2 text-xs font-semibold">{row.personName}</p>
                            <p className="text-ink-4 text-[11px]">{row.personTitle}</p>
                            {row.personEmail
                              ? <p className="text-emerald-600 text-[11px]">{row.personEmail}</p>
                              : <p className="text-ink-4 text-[11px]">no email</p>}
                          </div>
                        ) : row.status === "error"
                          ? <p className="text-red-500 text-xs">{row.error}</p>
                          : <p className="text-ink-4 text-xs">—</p>}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-ink-2 text-xs truncate">{row.subjectLine ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.scores ? (
                          <span className="text-xs font-bold tabular-nums flex gap-0.5">
                            {(["personalization", "clarity", "cta"] as (keyof QS)[]).map((k, i) => (
                              <span key={k} className="flex items-center gap-0.5">
                                {i > 0 && <span className="text-ink-4 font-normal">·</span>}
                                <span className={row.scores![k] >= 7 ? "text-emerald-600" : row.scores![k] >= 5 ? "text-amber-500" : "text-red-500"}>
                                  {row.scores![k]}
                                </span>
                              </span>
                            ))}
                          </span>
                        ) : <span className="text-ink-4 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        {row.apolloContactId
                          ? <span className="text-emerald-600 font-semibold">{row.enrolledInSequence ? "✓ In sequence" : "✓ Added"}</span>
                          : row.status === "done" ? <span className="text-amber-500">Skipped</span>
                          : <span className="text-ink-4">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.status === "done" && (
                          <>
                            <button
                              onClick={() => patchRow(row.company, { expanded: !row.expanded })}
                              className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                            >
                              {row.expanded ? "Hide" : "Email"}
                            </button>
                            {row.lpUrl && (
                              <a href={row.lpUrl} target="_blank" rel="noopener noreferrer"
                                className="ml-3 text-xs text-ink-3 hover:text-ink transition-colors">
                                LP ↗
                              </a>
                            )}
                          </>
                        )}
                      </td>
                    </tr>

                    {row.expanded && row.emailBody && (
                      <tr key={`${row.company}-exp`} className="border-b border-[rgba(223,227,248,0.4)]">
                        <td colSpan={6} className="px-4 py-4 bg-[var(--input-bg)]">
                          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2">Email body</p>
                          <pre
                            className="text-xs text-ink-2 whitespace-pre-wrap leading-relaxed bg-[var(--surface)] border border-[var(--input-border)] rounded-xl p-4 backdrop-blur-sm"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {row.emailBody}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [tab, setTab] = useState<PageTab>("single");
  const [state, setState] = useState<AppState>(INITIAL);
  const update = (patch: Partial<AppState>) => setState((prev) => ({ ...prev, ...patch }));
  const { settings, save: saveSettings, loaded: settingsLoaded, isConfigured } = useSettings();

  async function handleCompanyLookup(company: string) {
    update({ stage: "company-lookup", lookupCompany: company, error: null });
    try {
      const data = await apiFetch<{ people: PersonResult[] }>("/api/people", { company });
      update({ stage: "people-picker", people: data.people });
    } catch (err) {
      update({ stage: "idle", error: err instanceof Error ? err.message : "People lookup failed" });
    }
  }

  function handlePersonSelect(person: PersonResult) {
    handleFormSubmit({ name: person.name, company: state.lookupCompany, linkedinUrl: person.linkedinUrl, email: person.email });
  }

  async function handleFormSubmit(prospect: ProspectInput) {
    update({ stage: "fetching-signals", prospect, error: null });
    try {
      const data = await apiFetch<{ signals: Signal[]; noSignals: boolean; duplicate: DupInfo | null }>("/api/signals", prospect);
      update({ stage: "signal-picker", signals: data.signals, noSignals: data.noSignals, duplicate: data.duplicate, dupDismissed: false });
    } catch (err) {
      update({ stage: "idle", error: err instanceof Error ? err.message : "Signal fetch failed" });
    }
  }

  async function handleSignalSelect(signal: Signal | null) {
    const prospect = state.prospect;
    if (!prospect) return;
    update({ stage: "generating", selectedSignal: signal, error: null });
    try {
      const { result } = await apiFetch<{ result: GenerationResult }>("/api/generate", {
        prospect, signal,
        senderCompany: settings.senderCompany,
        senderName: settings.senderName,
        defaultCtaUrl: settings.defaultCtaUrl,
      });
      const { slug, url: lpUrl } = await apiFetch<{ slug: string; url: string }>("/api/lp", {
        prospectName: prospect.name, company: prospect.company, content: result.landingPageContent,
      });
      const emailBody = result.emailBody.replace(/\[LP_URL\]/g, lpUrl);
      update({ stage: "review", generation: { ...result, emailBody }, editedEmailBody: emailBody, editedLpContent: result.landingPageContent, selectedSubjectIdx: 0, lpUrl, lpSlug: slug });
    } catch (err) {
      update({ stage: "signal-picker", error: err instanceof Error ? err.message : "Generation failed" });
    }
  }

  async function handleRegenerate() {
    const { prospect, selectedSignal, lpSlug } = state;
    if (!prospect) return;
    update({ regenerating: true, error: null });
    try {
      const { result } = await apiFetch<{ result: GenerationResult }>("/api/generate", {
        prospect, signal: selectedSignal,
        senderCompany: settings.senderCompany,
        senderName: settings.senderName,
        defaultCtaUrl: settings.defaultCtaUrl,
      });
      const { url: lpUrl } = await apiFetch<{ slug: string; url: string }>("/api/lp", {
        slug: lpSlug, content: result.landingPageContent,
      });
      const emailBody = result.emailBody.replace(/\[LP_URL\]/g, lpUrl);
      update({ generation: { ...result, emailBody }, editedEmailBody: emailBody, editedLpContent: result.landingPageContent, selectedSubjectIdx: 0, lpUrl, regenerating: false });
    } catch (err) {
      update({ regenerating: false, error: err instanceof Error ? err.message : "Regeneration failed" });
    }
  }

  async function handlePush() {
    const { prospect, generation, editedEmailBody, editedLpContent, selectedSubjectIdx, lpUrl, lpSlug, selectedSignal } = state;
    if (!prospect || !generation) return;
    const subjectLine = generation.subjectLines[selectedSubjectIdx]?.text ?? "";
    update({ instantlyStatus: "loading", slackStatus: "loading" });
    if (editedLpContent) {
      await fetch("/api/lp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: lpSlug, content: editedLpContent }) }).catch(() => {});
    }
    const [instOk, slackOk] = await Promise.all([
      fetch("/api/push/apollo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospect, emailBody: editedEmailBody, subjectLine, lpUrl, apolloApiKey: settings.apolloApiKey || undefined }) }).then((r) => r.json()).then((d) => Boolean(d.success)).catch(() => false),
      fetch("/api/push/slack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospectName: prospect.name, company: prospect.company, signalUsed: selectedSignal?.title ?? "", scores: generation.scores, lpUrl, slackWebhookUrl: settings.slackWebhookUrl || undefined }) }).then((r) => r.json()).then((d) => Boolean(d.success)).catch(() => false),
    ]);
    update({ instantlyStatus: instOk ? "success" : "error", slackStatus: slackOk ? "success" : "error" });
    fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: prospect.name, company: prospect.company, email: prospect.email, linkedinUrl: prospect.linkedinUrl, emailBody: editedEmailBody, subjectLine, lpSlug, lpUrl, scores: generation.scores, signalUsed: selectedSignal?.title, contactedAt: new Date().toISOString(), lpVisits: [], pushed: instOk && slackOk }) }).catch(() => {});
  }

  async function handleRetryApollo() {
    const { prospect, generation, editedEmailBody, selectedSubjectIdx, lpUrl } = state;
    if (!prospect || !generation) return;
    update({ instantlyStatus: "loading" });
    const subjectLine = generation.subjectLines[selectedSubjectIdx]?.text ?? "";
    const ok = await fetch("/api/push/apollo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospect, emailBody: editedEmailBody, subjectLine, lpUrl }) }).then((r) => r.json()).then((d) => Boolean(d.success)).catch(() => false);
    update({ instantlyStatus: ok ? "success" : "error" });
  }

  async function handleRetrySlack() {
    const { prospect, generation, selectedSignal, lpUrl } = state;
    if (!prospect || !generation) return;
    update({ slackStatus: "loading" });
    const ok = await fetch("/api/push/slack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospectName: prospect.name, company: prospect.company, signalUsed: selectedSignal?.title ?? "", scores: generation.scores, lpUrl }) }).then((r) => r.json()).then((d) => Boolean(d.success)).catch(() => false);
    update({ slackStatus: ok ? "success" : "error" });
  }

  const { stage, prospect, lookupCompany, people, signals, noSignals, duplicate, dupDismissed,
    generation, editedEmailBody, editedLpContent, selectedSubjectIdx, lpUrl, instantlyStatus, slackStatus, error, regenerating } = state;
  const isReviewing = stage === "review" || stage === "pushing";

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", position: "relative" }}>
      {/* ── Animated background ─────────────────────────────── */}
      <BackgroundCanvas />

      {/* ── All content above the background ────────────────── */}
      <div className="relative" style={{ zIndex: 1 }}>

        {/* ── Sticky header ─────────────────────────────────── */}
        <header
          className="sticky top-0 z-40 border-b transition-colors"
          style={{
            background: "var(--header-bg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "var(--header-border)",
          }}
        >
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <Logo />
            <nav className="flex items-center gap-4">
              <Link href="/history" className="text-xs font-semibold text-ink-3 hover:text-ink transition-colors">
                History
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────── */}
        <main className="max-w-4xl mx-auto px-6 py-8">

          {/* Tabs */}
          <TabBar
            tab={tab}
            onChange={(t) => { setTab(t); setState(INITIAL); }}
            showSettingsBadge={!isConfigured}
          />

          {/* ── BULK ─────────────────────────────────────── */}
          {tab === "bulk" && <BulkSection settings={settings} />}

          {/* ── SETTINGS ─────────────────────────────────── */}
          {tab === "settings" && settingsLoaded && (
            <SettingsBar
              settings={settings}
              onSave={(patch) => { saveSettings(patch); setTab("single"); }}
              isConfigured={isConfigured}
              forceOpen
            />
          )}

          {/* ── SINGLE ───────────────────────────────────── */}
          {tab === "single" && (
            <div className="space-y-4">

              {/* Error banner */}
              {error && (
                <div className="rounded-xl border border-red-400/40 bg-[var(--surface)] px-4 py-3 text-sm text-red-500 font-medium animate-fade-up">
                  {error}
                </div>
              )}

              {/* Hero banner — only on idle, first time */}
              {stage === "idle" && (
                <HeroBanner />
              )}

              {/* Entry form */}
              {(stage === "idle" || stage === "company-lookup" || stage === "fetching-signals") && (
                <EntryPanel
                  stage={stage}
                  onCompanyLookup={handleCompanyLookup}
                  onManualSubmit={handleFormSubmit}
                />
              )}

              {/* People picker */}
              {stage === "people-picker" && (
                <div className={`${GLASS} p-6`}>
                  <PeoplePicker
                    company={lookupCompany}
                    people={people}
                    onSelect={handlePersonSelect}
                    onBack={() => setState(INITIAL)}
                  />
                </div>
              )}

              {/* Prospect chip */}
              {prospect && stage !== "idle" && stage !== "fetching-signals" && stage !== "people-picker" && stage !== "company-lookup" && (
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-2.5 animate-fade-up"
                  style={{
                    background: "rgba(238,242,255,0.75)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(165,180,252,0.4)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-brand-400" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                    </span>
                    <span className="text-sm font-bold text-ink">{prospect.name}</span>
                    <span className="text-ink-3 text-sm">at</span>
                    <span className="text-sm font-bold text-ink">{prospect.company}</span>
                    {prospect.email && <span className="text-ink-4 text-xs ml-1">· {prospect.email}</span>}
                  </div>
                  <button onClick={() => setState(INITIAL)} className="text-xs text-ink-3 hover:text-ink font-medium transition-colors">
                    Start over
                  </button>
                </div>
              )}

              {/* Duplicate warning */}
              {duplicate && !dupDismissed && stage === "signal-picker" && (
                <div className="rounded-xl border border-amber-400/40 bg-[var(--surface)] px-4 py-3 animate-fade-up">
                  <p className="text-sm font-semibold text-amber-500 mb-0.5">You&apos;ve contacted this prospect before</p>
                  <p className="text-xs text-amber-500/70 mb-3">
                    {duplicate.name} at {duplicate.company} was contacted on {new Date(duplicate.contactedAt).toLocaleDateString()}.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => update({ dupDismissed: true })} className="text-xs font-semibold text-amber-700 border border-amber-300 hover:border-amber-400 rounded-lg px-3 py-1.5 transition-colors">
                      Continue anyway
                    </button>
                    <Link href="/history" className="text-xs text-ink-2 hover:text-ink self-center transition-colors font-medium">
                      View in history →
                    </Link>
                  </div>
                </div>
              )}

              {/* Signal picker */}
              {stage === "signal-picker" && (dupDismissed || !duplicate) && (
                <div className={`${GLASS} p-6`}>
                  <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-4">
                    Choose your angle
                  </h2>
                  <SignalPicker
                    signals={signals}
                    noSignals={noSignals}
                    onSelect={handleSignalSelect}
                    loading={false}
                  />
                </div>
              )}

              {/* ECG loader */}
              {stage === "generating" && (
                <div className={`${GLASS} animate-fade-up`}>
                  <EcgLoader
                    label="Crafting your email and landing page…"
                    sublabel="This usually takes 5–10 seconds"
                  />
                </div>
              )}

              {/* Review + push */}
              {isReviewing && generation && (
                <div className="space-y-4 animate-fade-up">
                  {/* Scores + angle */}
                  <div className={`${GLASS} p-6`}>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-3">Quality scores</h3>
                        <QualityScores scores={generation.scores} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-3">Why this angle</h3>
                        <p className="text-sm text-ink-2 leading-relaxed">{generation.angleReasoning}</p>
                      </div>
                    </div>
                  </div>

                  {/* Subject lines */}
                  <div className={`${GLASS} p-6`}>
                    <h3 className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-3">
                      Subject lines — pick one
                    </h3>
                    <SubjectLineVariants
                      subjects={generation.subjectLines}
                      selected={selectedSubjectIdx}
                      onSelect={(i) => update({ selectedSubjectIdx: i })}
                    />
                  </div>

                  {/* Email + LP editor */}
                  <div className={`${GLASS} p-6`}>
                    <ReviewPanel
                      emailBody={editedEmailBody}
                      onEmailBodyChange={(v) => update({ editedEmailBody: v })}
                      lpContent={editedLpContent ?? generation.landingPageContent}
                      onLpContentChange={(v) => update({ editedLpContent: v })}
                      lpUrl={lpUrl}
                      onRegenerate={handleRegenerate}
                      regenerating={regenerating}
                    />
                  </div>

                  {/* Push */}
                  <div className={`${GLASS} p-6`}>
                    <PushButton
                      scores={generation.scores}
                      ctaUrl={editedLpContent?.ctaUrl ?? generation.landingPageContent.ctaUrl}
                      onPush={handlePush}
                      instantlyStatus={instantlyStatus}
                      slackStatus={slackStatus}
                      onRetryInstantly={handleRetryApollo}
                      onRetrySlack={handleRetrySlack}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

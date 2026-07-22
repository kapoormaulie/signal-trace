"use client";

import { useEffect, useRef, useState } from "react";
import type { IcpProfile } from "@/types";

interface DiscoveredCompany {
  name: string;
  description: string;
  url: string;
}

interface Props {
  onAdd: (companies: string[]) => void;
  icpProfile?: IcpProfile;
  onSaveIcpProfile?: (patch: Partial<IcpProfile>) => void;
}

type DiscoverTab = "icp" | "filters" | "csv";

const INDUSTRIES = ["B2B SaaS", "FinTech", "HealthTech", "EdTech", "E-commerce", "MarTech", "HR Tech", "DevTools", "Cybersecurity", "AI / ML"];
const SIZES      = ["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"];
const LOCATIONS  = ["United States", "United Kingdom", "Europe", "India", "Canada", "Australia", "Global"];
const FUNDINGS   = ["Bootstrapped", "Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Public"];
const RESULT_COUNTS = [10, 20, 50, 100];

const INPUT = "w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all";
const BTN   = "px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";

export default function CompanyDiscovery({ onAdd, icpProfile, onSaveIcpProfile }: Props) {
  const [tab, setTab] = useState<DiscoverTab>("icp");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredCompany[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [icpDescription, setIcpDescription] = useState("");
  const [filters, setFilters] = useState({ industry: "", size: "", location: "", funding: "", keywords: "", lookalikeDomains: "" });
  const [count, setCount] = useState(20);
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvCompanies, setCsvCompanies] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvCol, setCsvCol] = useState(0);
  const [seededFromProfile, setSeededFromProfile] = useState(false);

  // Load the saved ICP profile once (on first arrival, or first login) — don't clobber
  // whatever the user is actively typing on later re-renders.
  useEffect(() => {
    if (seededFromProfile || !icpProfile?.updatedAt) return;
    setIcpDescription(icpProfile.description);
    setFilters(icpProfile.filters);
    setSeededFromProfile(true);
  }, [icpProfile, seededFromProfile]);

  function tabCls(active: boolean) {
    return `px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
      active
        ? "bg-[var(--surface)] text-ink shadow-sm border border-[var(--input-border)]"
        : "text-ink-3 hover:text-ink-2"
    }`;
  }

  function pillCls(active: boolean) {
    return `px-3 py-1.5 text-xs rounded-xl border cursor-pointer transition-all select-none ${
      active
        ? "border-brand-400 bg-[rgba(99,102,241,0.1)] text-brand-500 shadow-signal-sm"
        : "border-[var(--input-border)] text-ink-3 hover:border-brand-300 hover:text-ink-2 bg-[var(--input-bg)]"
    }`;
  }

  function toggleFilter(key: keyof typeof filters, val: string) {
    setFilters((f) => ({ ...f, [key]: f[key] === val ? "" : val }));
  }

  async function runDiscover() {
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(new Set());
    onSaveIcpProfile?.({ description: icpDescription, filters });
    const exclude = Array.from(addedNames);
    const body = tab === "icp"
      ? { mode: "icp", description: icpDescription, count, exclude }
      : { mode: "filters", filters, count, exclude };
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Discovery failed");
      // Belt-and-suspenders — filter client-side too in case of casing/whitespace drift
      const fresh: DiscoveredCompany[] = (data.companies ?? []).filter(
        (c: DiscoveredCompany) => !addedNames.has(c.name.trim().toLowerCase())
      );
      setResults(fresh);
      setSelected(new Set(fresh.map((c) => c.name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text
        .split("\n")
        .map((r) => r.split(",").map((c) => c.trim().replace(/^"|"$/g, "")))
        .filter((r) => r.some((c) => c));
      setCsvPreview(rows.slice(0, 6));
      setCsvCompanies(rows.slice(1).map((r) => r[csvCol]).filter(Boolean));
    };
    reader.readAsText(file);
  }

  function handleCsvColChange(col: number) {
    setCsvCol(col);
    if (csvPreview.length > 1) {
      setCsvCompanies(csvPreview.slice(1).map((r) => r[col]).filter(Boolean));
    }
  }

  function handleAddSelected() {
    const added = tab === "csv"
      ? csvCompanies
      : results.filter((c) => selected.has(c.name)).map((c) => c.name);
    onAdd(added);
    if (tab !== "csv") {
      // Remember these so the next search excludes them and surfaces a fresh set instead
      setAddedNames((prev) => {
        const next = new Set(prev);
        for (const name of added) next.add(name.trim().toLowerCase());
        return next;
      });
    }
    setResults([]);
    setCsvCompanies([]);
    setCsvPreview([]);
    setSelected(new Set());
  }

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--mist)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Find companies to target</h3>
          <p className="text-[11px] text-ink-3 mt-0.5">ICP match · Filter builder · CSV import</p>
        </div>
        <div className="flex gap-1 bg-[var(--input-bg)] rounded-xl p-1 border border-[var(--input-border)]">
          <button className={tabCls(tab === "icp")}    onClick={() => { setTab("icp");     setResults([]); }}>ICP match</button>
          <button className={tabCls(tab === "filters")} onClick={() => { setTab("filters"); setResults([]); }}>Filter builder</button>
          <button className={tabCls(tab === "csv")}    onClick={() => { setTab("csv");     setResults([]); }}>Import CSV</button>
        </div>
      </div>

      {/* How many companies to find — shared by ICP + Filter builder */}
      {tab !== "csv" && results.length === 0 && (
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-2">How many companies?</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {RESULT_COUNTS.map((n) => (
              <span key={n} className={pillCls(count === n)} onClick={() => setCount(n)}>
                Up to {n}
              </span>
            ))}
            <input
              type="number"
              min={1}
              max={100}
              placeholder="Custom"
              value={RESULT_COUNTS.includes(count) ? "" : count}
              onChange={(e) => {
                const v = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                setCount(v);
              }}
              className={`w-20 text-center text-xs rounded-xl border px-2 py-1.5 transition-all ${
                !RESULT_COUNTS.includes(count)
                  ? "border-brand-400 bg-[rgba(99,102,241,0.1)] text-brand-500 shadow-signal-sm"
                  : "border-[var(--input-border)] text-ink-3 bg-[var(--input-bg)] focus:border-brand-300"
              } focus:outline-none`}
            />
          </div>
          <p className="text-[10px] text-ink-4 mt-1.5">
            Max 100 per search.
            {addedNames.size > 0 && ` Already added ${addedNames.size} — re-running will skip those and find a fresh set.`}
          </p>
        </div>
      )}

      {/* ── ICP Match ─────────────────────────────────────────── */}
      {tab === "icp" && results.length === 0 && (
        <div className="space-y-3">
          <p className="text-xs text-ink-3 leading-relaxed">
            Describe what you sell and who buys it — we&apos;ll find companies that match.
            {icpProfile?.updatedAt && (
              <span className="text-ink-4"> Saved from your last search — edit and re-run anytime.</span>
            )}
          </p>
          <textarea
            className={INPUT + " resize-none"}
            rows={3}
            placeholder="e.g. We sell revenue intelligence software to B2B SaaS companies with growing sales teams who struggle with forecast accuracy"
            value={icpDescription}
            onChange={(e) => setIcpDescription(e.target.value)}
          />
          <button onClick={runDiscover} disabled={!icpDescription.trim() || loading} className={BTN}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Searching…
              </span>
            ) : "Find matching companies →"}
          </button>
        </div>
      )}

      {/* ── Filter Builder ─────────────────────────────────── */}
      {tab === "filters" && results.length === 0 && (
        <div className="space-y-4">
          <FilterRow label="Industry"      options={INDUSTRIES} value={filters.industry}  pillCls={pillCls} onChange={(v) => toggleFilter("industry", v)} />
          <FilterRow label="Company size"  options={SIZES}      value={filters.size}      pillCls={pillCls} onChange={(v) => toggleFilter("size", v)} />
          <FilterRow label="Location"      options={LOCATIONS}  value={filters.location}  pillCls={pillCls} onChange={(v) => toggleFilter("location", v)} />
          <FilterRow label="Funding stage" options={FUNDINGS}   value={filters.funding}   pillCls={pillCls} onChange={(v) => toggleFilter("funding", v)} />
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Additional keywords (optional)</label>
            <input
              className={INPUT}
              placeholder="e.g. uses Salesforce, recently hired sales reps, product-led growth"
              value={filters.keywords}
              onChange={(e) => setFilters((f) => ({ ...f, keywords: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Find companies like these (optional)</label>
            <input
              className={INPUT}
              placeholder="e.g. stripe.com, ramp.com — up to 5 domains, comma-separated"
              value={filters.lookalikeDomains}
              onChange={(e) => setFilters((f) => ({ ...f, lookalikeDomains: e.target.value }))}
            />
            <p className="text-[10px] text-ink-4 mt-1">Give a few of your best-fit customers and we&apos;ll find companies that look like them.</p>
          </div>
          <button
            onClick={runDiscover}
            disabled={loading || Object.values(filters).every((v) => !v)}
            className={BTN}
          >
            {loading ? "Searching…" : "Find companies →"}
          </button>
        </div>
      )}

      {/* ── CSV Import ─────────────────────────────────────── */}
      {tab === "csv" && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-brand-400 hover:bg-brand-50/30"
            style={{ borderColor: "rgba(165,180,252,0.5)" }}
            onClick={() => fileRef.current?.click()}
          >
            <div className="flex justify-center mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink-2">Click to upload CSV</p>
            <p className="text-xs text-ink-4 mt-1">Exported from Clay, Apollo, LinkedIn Sales Nav, HubSpot…</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvUpload} />
          </div>

          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-2">Which column has company names?</label>
                <div className="flex flex-wrap gap-2">
                  {csvPreview[0]?.map((header, i) => (
                    <button key={i} onClick={() => handleCsvColChange(i)} className={pillCls(csvCol === i)}>
                      {header || `Column ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="rounded-xl p-3 text-xs space-y-0.5"
                style={{ fontFamily: "var(--font-mono)", background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
              >
                {csvPreview.slice(1, 5).map((row, i) => (
                  <p key={i} className="truncate text-ink-2">{row[csvCol]}</p>
                ))}
                {csvCompanies.length > 4 && <p className="text-ink-4">+{csvCompanies.length - 4} more…</p>}
              </div>
              <button onClick={handleAddSelected} className={BTN}>
                Add {csvCompanies.length} companies to queue →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}

      {/* ── Results ───────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-3">
              Found <span className="text-ink font-bold">{results.length} companies</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSelected(new Set(results.map((c) => c.name)))}
                className="text-xs text-brand-600 hover:text-brand-400 font-semibold transition-colors">
                Select all
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-ink-4 hover:text-ink-2 transition-colors">
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
            {results.map((c) => (
              <button
                key={c.name}
                onClick={() => toggleSelect(c.name)}
                className={`text-left rounded-xl border p-3 transition-all card-lift ${
                  selected.has(c.name)
                    ? "border-brand-400 bg-[rgba(99,102,241,0.1)]"
                    : "border-[var(--input-border)] bg-[var(--input-bg)] hover:border-brand-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-ink">{c.name}</p>
                  {selected.has(c.name) && (
                    <span className="shrink-0 text-[10px] font-bold text-brand-500 bg-[rgba(99,102,241,0.12)] rounded px-1">✓</span>
                  )}
                </div>
                <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-2">{c.description}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleAddSelected} disabled={selected.size === 0} className={BTN}>
              Add {selected.size} to queue →
            </button>
            <button onClick={() => { setResults([]); setSelected(new Set()); }}
              className="text-xs text-ink-3 hover:text-ink font-medium transition-colors">
              Search again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label, options, value, onChange, pillCls,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  pillCls: (active: boolean) => string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-2 mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <span key={opt} className={pillCls(value === opt)} onClick={() => onChange(opt)}>{opt}</span>
        ))}
      </div>
    </div>
  );
}

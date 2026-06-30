"use client";

import { useEffect, useState } from "react";

// ── Static data ──────────────────────────────────────────────────────────────

const PROSPECTS = [
  { initials: "SC", name: "Sarah Chen",  role: "VP Sales",   bg: "#6366F1" },
  { initials: "AP", name: "Alex Park",   role: "CEO",         bg: "#8B5CF6" },
  { initials: "PN", name: "Priya Nair",  role: "Head of BD",  bg: "#06B6D4" },
];

const SCORES = [
  { label: "Personalization", pct: "90%", color: "#6366F1", val: 9 },
  { label: "Clarity",         pct: "80%", color: "#8B5CF6", val: 8 },
  { label: "CTA Strength",    pct: "90%", color: "#10B981", val: 9 },
];

const EMAIL_ROWS = [
  { label: "To:",  val: "sarah@stripe.com" },
  { label: "Sub:", val: "Re: Stripe's $694M raise →" },
  { label: "",     val: "Hi Sarah, saw the announcement…" },
];

const FEATURES = [
  { label: "Live signal detection", cls: "border-brand-300/40 text-brand-600" },
  { label: "AI-written emails",     cls: "border-violet-300/40 text-violet-600" },
  { label: "Apollo + Slack push",   cls: "border-emerald-300/40 text-emerald-600" },
  { label: "Personalised LPs",      cls: "border-sky-300/40 text-sky-600" },
];

const STEPS = [
  { n: "1", label: "Find signal", color: "#6366F1" },
  { n: "2", label: "Write email", color: "#8B5CF6" },
  { n: "3", label: "Push to CRM", color: "#10B981" },
];

// ── Root ─────────────────────────────────────────────────────────────────────

export default function HeroBanner() {
  const [phase, setPhase]           = useState<0 | 1 | 2 | 3>(0);
  const [rows, setRows]             = useState(0);
  const [emailLines, setEmailLines] = useState(0);
  const [launched, setLaunched]     = useState(false);
  const [cycleKey, setCycleKey]     = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    function cycle() {
      setCycleKey((k) => k + 1);
      setPhase(0); setRows(0); setEmailLines(0); setLaunched(false);

      after(350,  () => setRows(1));
      after(750,  () => setRows(2));
      after(1100, () => setRows(3));
      after(2000, () => setPhase(1));
      after(3200, () => { setPhase(2); setEmailLines(0); });
      after(3650, () => setEmailLines(1));
      after(4050, () => setEmailLines(2));
      after(4450, () => setEmailLines(3));
      after(5300, () => setPhase(3));
      after(6200, () => setLaunched(true));
      after(7800, () => cycle());
    }

    cycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mb-10 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center gap-10 py-8">

        {/* ── LEFT: copy ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Status pill */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{ background: "var(--surface)", border: "1px solid var(--mist)" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 tracking-wide uppercase">Live</span>
            <span className="text-[11px] text-ink-3 font-medium">· Powered by Groq + Exa</span>
          </div>

          {/* Headline */}
          <h1
            className="font-extrabold tracking-tight mb-5 hero-headline"
            style={{ fontSize: "clamp(2rem,4vw,3.25rem)", lineHeight: 1.1 }}
          >
            <span className="gradient-text">Turn buying signals</span>
            <br />
            <span className="text-ink">into booked meetings.</span>
          </h1>

          {/* Sub-copy */}
          <p className="text-[15px] text-ink-3 leading-relaxed mb-7 max-w-md">
            Surface live intent signals — funding rounds, new hires, product launches — and
            generate hyper&#8209;personalised outreach in under 60 seconds.
          </p>

          {/* 3-step flow */}
          <div className="flex flex-wrap items-center gap-1.5 mb-7">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-2"
                  style={{ background: "var(--surface)", border: "1px solid var(--mist)" }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{ background: s.color, fontSize: "9px" }}
                  >
                    {s.n}
                  </span>
                  {s.label}
                </div>
                {i < 2 && <span className="text-ink-4 text-xs select-none">→</span>}
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {FEATURES.map(({ label, cls }) => (
              <span
                key={label}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold bg-[var(--surface)] ${cls}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: animated demo card — hidden on mobile ──────────── */}
        <div className="hidden lg:block lg:w-[350px] shrink-0">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--input-border)",
              boxShadow: "0 8px 40px rgba(79,70,229,0.15), 0 0 0 1px rgba(99,102,241,0.10)",
            }}
          >
            {/* Window chrome */}
            <div
              className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--input-border)]"
              style={{ background: "var(--input-bg)" }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(239,68,68,0.55)" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(251,191,36,0.70)" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(74,222,128,0.65)" }} />
              <span className="ml-3 text-[10px] text-ink-4 font-mono tracking-tight">signal-trace · live</span>
              <span className="ml-auto relative flex h-1.5 w-1.5">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            </div>

            {/* Phase content */}
            <div className="p-4 min-h-[260px] flex flex-col justify-start">
              {phase === 0 && <PhaseList key={`list-${cycleKey}`} rows={rows} />}
              {phase === 1 && <PhaseSignal key={`sig-${cycleKey}`} />}
              {phase === 2 && <PhaseEmail key={`email-${cycleKey}`} lines={emailLines} />}
              {phase === 3 && <PhaseLaunch key={`launch-${cycleKey}`} launched={launched} />}
            </div>

            {/* Step progress tabs */}
            <div
              className="flex border-t border-[var(--input-border)]"
              style={{ background: "var(--input-bg)" }}
            >
              {(["1 · Signal", "2 · Draft", "3 · Email", "4 · Push"] as const).map((label, i) => (
                <div
                  key={label}
                  className="flex-1 text-center py-2 text-[9px] font-semibold transition-all duration-500"
                  style={{
                    color: i === phase ? "#6366F1" : "var(--ink-4)",
                    background: i === phase ? "rgba(99,102,241,0.08)" : "transparent",
                    borderBottom: i === phase ? "2px solid #6366F1" : "2px solid transparent",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Phase: list building ─────────────────────────────────────────────────────

function PhaseList({ rows }: { rows: number }) {
  return (
    <div className="space-y-2 demo-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="#6366F1" strokeWidth="1.4" />
          <path d="M9.5 9.5L12 12" stroke="#6366F1" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-semibold text-ink-2">
          Finding prospects at{" "}
          <span className="text-brand-500">Stripe</span>
        </span>
        <span className="ml-auto">
          {rows < 3 ? (
            <span className="flex items-center gap-1 text-[10px] text-ink-4">
              <span className="w-3 h-3 border-[1.5px] border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              Scanning
            </span>
          ) : (
            <span className="text-[10px] text-emerald-500 font-semibold">3 found ✓</span>
          )}
        </span>
      </div>

      {PROSPECTS.map((p, i) => (
        <div
          key={p.name}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] ${
            i < rows ? "row-appear" : ""
          }`}
          style={i >= rows ? { opacity: 0 } : undefined}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 font-bold"
            style={{ background: p.bg, fontSize: "9px" }}
          >
            {p.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{p.name}</p>
            <p className="text-[10px] text-ink-4">{p.role}</p>
          </div>
          <span
            className="text-[9px] text-brand-500 font-semibold px-2 py-0.5 rounded-full border border-brand-300/30 shrink-0"
            style={{ background: "rgba(99,102,241,0.07)" }}
          >
            Match
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Phase: signal detected ───────────────────────────────────────────────────

function PhaseSignal() {
  return (
    <div className="space-y-2.5 demo-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-sm"
          style={{ background: "rgba(251,191,36,0.15)" }}
        >
          ⚡
        </span>
        <span className="text-xs font-semibold text-ink-2">Signal detected</span>
        <span
          className="ml-auto text-[10px] text-amber-600 font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.30)" }}
        >
          New
        </span>
      </div>

      {/* Signal card */}
      <div
        className="rounded-xl p-3 signal-slide-up"
        style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)" }}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-xs font-bold text-ink">Stripe raises $694M Series H</p>
          <div className="relative flex h-4 w-4 shrink-0 mt-0.5">
            <span
              className="signal-ring absolute inline-flex h-full w-full rounded-full"
              style={{ border: "1px solid rgba(251,191,36,0.65)" }}
            />
            <span
              className="relative h-4 w-4 rounded-full"
              style={{ background: "rgba(251,191,36,0.18)" }}
            />
          </div>
        </div>
        <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
          Expansion pressure post&#8209;raise — optimal timing for outreach.
        </p>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-medium text-amber-600 px-1.5 py-0.5 rounded"
            style={{ background: "rgba(251,191,36,0.15)" }}
          >
            💰 Funding
          </span>
          <span className="text-[10px] text-ink-4">TechCrunch · 2d ago</span>
        </div>
      </div>

      {/* Target prospect */}
      <div
        className="rounded-xl p-2.5 signal-slide-up flex items-center gap-2.5"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          animationDelay: "0.22s",
        }}
      >
        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white shrink-0" style={{ fontSize: "9px" }}>
          SC
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink">Sarah Chen</p>
          <p className="text-[10px] text-ink-4">VP Sales · Stripe</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-brand-500 font-semibold shrink-0">
          <span className="w-2.5 h-2.5 border-[1.5px] border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          Writing
        </div>
      </div>
    </div>
  );
}

// ── Phase: email composing ───────────────────────────────────────────────────

function PhaseEmail({ lines }: { lines: number }) {
  return (
    <div className="space-y-2 demo-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
          <rect x="1" y="1" width="11" height="9" rx="1.2" stroke="#7C3AED" strokeWidth="1.3" />
          <path d="M1.5 2L6.5 6.5L11.5 2" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-semibold text-ink-2">Writing email…</span>
        <span className="ml-auto w-3 h-3 border-[1.5px] border-violet-200 border-t-violet-500 rounded-full animate-spin" />
      </div>

      <div
        className="rounded-xl p-3"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          minHeight: "90px",
        }}
      >
        {EMAIL_ROWS.map((row, i) => {
          if (i < lines) {
            return (
              <div key={i} className="flex gap-2 mb-1.5 row-appear">
                {row.label && (
                  <span className="text-ink-4 w-8 shrink-0">{row.label}</span>
                )}
                <span className="text-ink">{row.val}</span>
              </div>
            );
          }
          if (i === lines && lines < EMAIL_ROWS.length) {
            return (
              <div key={i} className="flex gap-2 mb-1.5 opacity-40">
                <span className="text-ink cursor-blink">▌</span>
              </div>
            );
          }
          return null;
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-ink-4">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
        <span style={{ fontFamily: "var(--font-mono)" }}>groq · llama-3.3-70b-versatile · drafting</span>
      </div>
    </div>
  );
}

// ── Phase: launched ──────────────────────────────────────────────────────────

function PhaseLaunch({ launched }: { launched: boolean }) {
  return (
    <div className="space-y-3 demo-fade-in">
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-emerald-500 font-bold text-xs success-pop"
          style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.30)" }}
        >
          ✓
        </span>
        <span className="text-xs font-semibold text-ink-2">Pushed to Apollo + Slack</span>
        <span className="ml-auto text-[10px] text-emerald-500 font-bold success-pop">Sent!</span>
      </div>

      {/* Rocket / success */}
      <div className="flex flex-col items-center justify-center h-[76px] relative overflow-hidden">
        {!launched ? (
          <div className="flex flex-col items-center">
            <div className="rocket-lift" style={{ fontSize: "28px", lineHeight: 1 }}>🚀</div>
            <div
              className="rocket-trail w-3 rounded-b-full"
              style={{ background: "linear-gradient(to bottom, rgba(251,146,60,0.55), transparent)" }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 success-pop">
            <span style={{ fontSize: "26px" }}>✨</span>
            <p className="text-[11px] font-semibold text-emerald-500">Lead delivered!</p>
          </div>
        )}
      </div>

      {/* Quality scores */}
      <div className="space-y-1.5">
        {SCORES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-[10px] text-ink-4 shrink-0" style={{ width: "100px" }}>
              {s.label}
            </span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--mist)" }}>
              <div
                className="h-full rounded-full bar-grow"
                style={{
                  "--bar-w": s.pct,
                  "--bar-delay": `${i * 100}ms`,
                  background: s.color,
                } as React.CSSProperties}
              />
            </div>
            <span className="text-[10px] font-bold text-ink w-5 text-right">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

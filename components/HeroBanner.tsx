"use client";

const FEATURES = [
  {
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.41 1.41M11.36 11.36l1.41 1.41M3.22 12.78l1.41-1.41M11.36 4.64l1.41-1.41"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: "Live signal detection",
    cls: "border-brand-300 text-brand-600",
  },
  {
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M2 3h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 7h6M5 9.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: "AI-written emails",
    cls: "border-violet-300 text-violet-600",
  },
  {
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M13 3L6 10M13 3H9M13 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 4H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: "Apollo + Slack push",
    cls: "border-emerald-300 text-emerald-600",
  },
  {
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 14h4M8 11v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: "Personalised landing pages",
    cls: "border-sky-300 text-sky-600",
  },
];

export default function HeroBanner() {
  return (
    <div className="mb-8 animate-fade-up">
      {/* ── Main hero card ───────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden mb-5"
        style={{
          background: "linear-gradient(135deg, rgba(238,242,255,0.95) 0%, rgba(245,243,255,0.9) 45%, rgba(239,246,255,0.9) 100%)",
          border: "1px solid rgba(165,180,252,0.35)",
          boxShadow: "0 4px 32px rgba(79,70,229,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        {/* Dark mode override */}
        <style>{`
          [data-theme="dark"] .hero-card-inner {
            background: linear-gradient(135deg, rgba(30,28,80,0.95) 0%, rgba(40,24,80,0.9) 45%, rgba(20,32,60,0.9) 100%) !important;
            border-color: rgba(79,70,229,0.3) !important;
          }
        `}</style>

        {/* ECG background waveform */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 160"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          aria-hidden
        >
          <line x1="0" y1="80" x2="1200" y2="80" stroke="#C7D2FE" strokeWidth="0.8" opacity="0.6" />
          <path
            d="
              M-60 80 L 100 80 L 115 66 L 130 96 L 150 32 L 170 122 L 185 80 L 380 80
              L 395 66 L 410 96 L 430 32 L 450 122 L 465 80 L 660 80
              L 675 66 L 690 96 L 710 32 L 730 122 L 745 80 L 940 80
              L 955 66 L 970 96 L 990 32 L 1010 122 L 1025 80 L 1260 80
            "
            stroke="#4F46E5"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hero-ecg-path"
          />
        </svg>

        {/* Content */}
        <div className="relative px-8 py-10 flex flex-col items-center text-center">
          {/* Status pill */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 animate-fade-up"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(165,180,252,0.5)",
              backdropFilter: "blur(8px)",
              animationDelay: "0.05s",
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 tracking-wide uppercase">Live</span>
            <span className="text-[11px] text-ink-3 font-medium">· Signal-powered outreach</span>
          </div>

          {/* Main headline */}
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 hero-headline animate-fade-up delay-100"
            style={{ lineHeight: 1.12 }}
          >
            <span className="gradient-text">Find the signal.</span>
            <br />
            <span className="text-ink">Write the email.</span>
            <br />
            <span className="gradient-text">Push the lead.</span>
          </h1>

          {/* Sub-copy */}
          <p
            className="text-sm text-ink-3 max-w-sm leading-relaxed animate-fade-up delay-200"
          >
            Surface live buying signals, generate hyper-personalised outreach, and push to your CRM — all in one flow.
          </p>
        </div>
      </div>

      {/* ── Feature pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 justify-center">
        {FEATURES.map(({ icon, label, cls }, i) => (
          <span
            key={label}
            className={`animate-fade-up flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-sm bg-[var(--surface)] ${cls}`}
            style={{
              animationDelay: `${i * 80 + 320}ms`,
              opacity: 0,
            }}
          >
            {icon}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

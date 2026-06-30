"use client";

interface Props {
  label?: string;
  sublabel?: string;
}

export default function EcgLoader({
  label = "Analysing signals…",
  sublabel,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Main ECG animation */}
      <div className="relative">
        <svg
          width="280"
          height="60"
          viewBox="0 0 280 60"
          fill="none"
          className="overflow-visible"
          aria-hidden
        >
          {/* Glow layer — blurred duplicate */}
          <path
            d="M0 30 L 66 30 L 72 21 L 78 41 L 92 5 L 106 51 L 112 30 L 210 30"
            stroke="#818CF8"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ecg-path"
            style={{ filter: "blur(8px)", opacity: 0.35 }}
          />
          {/* Baseline */}
          <line x1="0" y1="30" x2="280" y2="30" stroke="#E0E7FF" strokeWidth="1" />
          {/* Main trace */}
          <path
            d="M0 30 L 66 30 L 72 21 L 78 41 L 92 5 L 106 51 L 112 30 L 210 30"
            stroke="#4F46E5"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ecg-path"
          />
          {/* Trailing dots */}
          <circle cx="222" cy="30" r="3.5" fill="#4F46E5" className="ecg-dot-1" />
          <circle cx="238" cy="30" r="3.5" fill="#6366F1" className="ecg-dot-2" />
          <circle cx="254" cy="30" r="3.5" fill="#818CF8" className="ecg-dot-3" />
        </svg>

        {/* Side labels on the Y-axis — mimics oscilloscope */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[9px] font-mono text-brand-300 select-none pointer-events-none opacity-60">
          <span>+</span>
          <span>—</span>
          <span>−</span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-sm font-semibold text-ink-2 tracking-wide">{label}</p>
        {sublabel && (
          <p className="text-xs text-ink-4 mt-1">{sublabel}</p>
        )}
      </div>

      {/* Scanning bar */}
      <div className="w-48 h-0.5 rounded-full bg-brand-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-violet-400"
          style={{
            width: "40%",
            animation: "scan-bar 1.6s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes scan-bar {
          0%   { transform: translateX(-100%); opacity: 0.5; }
          50%  { opacity: 1; }
          100% { transform: translateX(300%); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5 group">
      {/* ECG mark in indigo square */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        style={{
          filter: "drop-shadow(0 0 6px rgba(79,70,229,0.35))",
          transition: "filter 0.2s ease",
        }}
        className="group-hover:[filter:drop-shadow(0_0_10px_rgba(79,70,229,0.55))]"
      >
        {/* Indigo background */}
        <rect width="32" height="32" rx="7" fill="url(#logo-grad)" />
        {/* ECG waveform */}
        <path
          d="M3.5 16 L10 16 L12.5 11 L15.5 21.5 L20 4.5 L24.5 23 L27 16 L28.5 16"
          stroke="white"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      <span className="text-[15px] tracking-[-0.02em] select-none">
        <span className="font-semibold text-ink">Signal</span>
        <span className="font-extrabold gradient-text">Trace</span>
      </span>
    </div>
  );
}

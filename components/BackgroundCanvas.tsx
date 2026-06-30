// Fixed full-screen background: dot grid + gradient blobs + floating particles + orbit rings

const PARTICLES = [
  { x: "8%",  y: "15%", size: 4,  dur: "9s",  delay: "0s",   color: "rgba(99,102,241,0.35)" },
  { x: "22%", y: "72%", size: 3,  dur: "11s", delay: "1.5s", color: "rgba(124,58,237,0.3)" },
  { x: "38%", y: "40%", size: 5,  dur: "7s",  delay: "3s",   color: "rgba(79,70,229,0.25)" },
  { x: "55%", y: "82%", size: 3,  dur: "13s", delay: "0.8s", color: "rgba(139,92,246,0.28)" },
  { x: "67%", y: "28%", size: 6,  dur: "8s",  delay: "2.2s", color: "rgba(99,102,241,0.2)" },
  { x: "78%", y: "60%", size: 3,  dur: "10s", delay: "4s",   color: "rgba(165,180,252,0.35)" },
  { x: "90%", y: "18%", size: 4,  dur: "12s", delay: "1s",   color: "rgba(124,58,237,0.22)" },
  { x: "14%", y: "88%", size: 5,  dur: "9.5s",delay: "5s",   color: "rgba(79,70,229,0.2)" },
  { x: "46%", y: "12%", size: 3,  dur: "14s", delay: "2.5s", color: "rgba(99,102,241,0.3)" },
  { x: "82%", y: "90%", size: 4,  dur: "8.5s",delay: "0.3s", color: "rgba(139,92,246,0.25)" },
  { x: "30%", y: "55%", size: 2,  dur: "11s", delay: "6s",   color: "rgba(165,180,252,0.4)" },
  { x: "62%", y: "44%", size: 3,  dur: "10s", delay: "1.8s", color: "rgba(79,70,229,0.22)" },
  { x: "5%",  y: "50%", size: 4,  dur: "7.5s",delay: "3.5s", color: "rgba(99,102,241,0.28)" },
  { x: "95%", y: "65%", size: 3,  dur: "9s",  delay: "2s",   color: "rgba(124,58,237,0.2)" },
  { x: "50%", y: "95%", size: 5,  dur: "12s", delay: "4.5s", color: "rgba(139,92,246,0.22)" },
];

const RINGS = [
  { cx: "10%",  cy: "20%", w: 180, h: 180, spinDur: "45s",  color: "rgba(99,102,241,0.06)",  delay: "0s" },
  { cx: "88%",  cy: "75%", w: 240, h: 240, spinDur: "60s",  color: "rgba(124,58,237,0.05)",  delay: "8s" },
  { cx: "50%",  cy: "50%", w: 320, h: 120, spinDur: "35s",  color: "rgba(79,70,229,0.04)",   delay: "4s" },
];

export default function BackgroundCanvas() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {/* Dot grid */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.055 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="st-dot-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="var(--ink-2)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#st-dot-grid)" />
      </svg>

      {/* Gradient blobs */}
      <div className="blob-tl" />
      <div className="blob-br" />
      <div className="blob-mid" />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            "--dur": p.dur,
            "--delay": p.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Orbit rings */}
      {RINGS.map((r, i) => (
        <div
          key={i}
          className="orbit-ring"
          style={{
            left: `calc(${r.cx} - ${r.w / 2}px)`,
            top: `calc(${r.cy} - ${r.h / 2}px)`,
            width: r.w,
            height: r.h,
            borderColor: r.color,
            "--spin-dur": r.spinDur,
            animationDelay: r.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

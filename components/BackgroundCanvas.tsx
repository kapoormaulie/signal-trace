const PARTICLES = [
  { x: "4%",  y: "12%", s: 3, dur: "14s", delay: "0s",   c: "rgba(99,102,241,0.65)"  },
  { x: "11%", y: "38%", s: 2, dur: "11s", delay: "2s",   c: "rgba(79,70,229,0.55)"   },
  { x: "7%",  y: "68%", s: 4, dur: "17s", delay: "5s",   c: "rgba(99,102,241,0.4)"   },
  { x: "18%", y: "88%", s: 2, dur: "13s", delay: "1s",   c: "rgba(124,58,237,0.5)"   },
  { x: "15%", y: "5%",  s: 2, dur: "19s", delay: "1.8s", c: "rgba(165,180,252,0.65)" },
  { x: "27%", y: "22%", s: 3, dur: "12s", delay: "3s",   c: "rgba(139,92,246,0.45)"  },
  { x: "34%", y: "58%", s: 2, dur: "18s", delay: "7s",   c: "rgba(165,180,252,0.6)"  },
  { x: "42%", y: "80%", s: 4, dur: "10s", delay: "0.5s", c: "rgba(124,58,237,0.4)"   },
  { x: "24%", y: "46%", s: 3, dur: "16s", delay: "8s",   c: "rgba(139,92,246,0.35)"  },
  { x: "38%", y: "3%",  s: 2, dur: "14s", delay: "0.3s", c: "rgba(124,58,237,0.5)"   },
  { x: "50%", y: "9%",  s: 2, dur: "20s", delay: "5s",   c: "rgba(99,102,241,0.55)"  },
  { x: "54%", y: "34%", s: 3, dur: "11s", delay: "2.5s", c: "rgba(79,70,229,0.4)"    },
  { x: "47%", y: "67%", s: 4, dur: "14s", delay: "9s",   c: "rgba(124,58,237,0.45)"  },
  { x: "51%", y: "92%", s: 2, dur: "13s", delay: "1.5s", c: "rgba(99,102,241,0.55)"  },
  { x: "60%", y: "98%", s: 3, dur: "16s", delay: "8.5s", c: "rgba(6,182,212,0.38)"   },
  { x: "63%", y: "19%", s: 3, dur: "12s", delay: "4.5s", c: "rgba(6,182,212,0.45)"   },
  { x: "69%", y: "50%", s: 2, dur: "17s", delay: "0.8s", c: "rgba(14,165,233,0.38)"  },
  { x: "73%", y: "77%", s: 4, dur: "10s", delay: "3.5s", c: "rgba(6,182,212,0.32)"   },
  { x: "81%", y: "13%", s: 3, dur: "15s", delay: "6.5s", c: "rgba(99,102,241,0.55)"  },
  { x: "86%", y: "40%", s: 2, dur: "11s", delay: "2.2s", c: "rgba(124,58,237,0.4)"   },
  { x: "89%", y: "64%", s: 4, dur: "18s", delay: "10s",  c: "rgba(139,92,246,0.38)"  },
  { x: "93%", y: "86%", s: 2, dur: "13s", delay: "4s",   c: "rgba(99,102,241,0.55)"  },
  { x: "40%", y: "96%", s: 3, dur: "12s", delay: "5.5s", c: "rgba(79,70,229,0.42)"   },
  { x: "75%", y: "95%", s: 2, dur: "15s", delay: "3s",   c: "rgba(139,92,246,0.42)"  },
  { x: "96%", y: "52%", s: 3, dur: "10s", delay: "7.5s", c: "rgba(99,102,241,0.55)"  },
];

const BEAMS = [
  { top: "8%",  dur: "32s", delay: "0s",  op: 0.28 },
  { top: "30%", dur: "44s", delay: "8s",  op: 0.18 },
  { top: "55%", dur: "26s", delay: "16s", op: 0.22 },
  { top: "74%", dur: "50s", delay: "4s",  op: 0.16 },
  { top: "90%", dur: "36s", delay: "22s", op: 0.2  },
];

const RINGS = [
  { cx: "8%",  cy: "18%", w: 240, h: 240, dur: "58s",  color: "rgba(99,102,241,0.20)",  delay: "0s"  },
  { cx: "90%", cy: "80%", w: 320, h: 320, dur: "78s",  color: "rgba(124,58,237,0.17)",  delay: "10s" },
  { cx: "50%", cy: "50%", w: 460, h: 150, dur: "48s",  color: "rgba(79,70,229,0.14)",   delay: "5s"  },
  { cx: "20%", cy: "76%", w: 200, h: 200, dur: "68s",  color: "rgba(139,92,246,0.18)",  delay: "15s" },
  { cx: "78%", cy: "24%", w: 280, h: 280, dur: "52s",  color: "rgba(99,102,241,0.15)",  delay: "8s"  },
  { cx: "50%", cy: "12%", w: 400, h: 110, dur: "38s",  color: "rgba(6,182,212,0.13)",   delay: "12s" },
  { cx: "35%", cy: "62%", w: 220, h: 220, dur: "85s",  color: "rgba(79,70,229,0.12)",   delay: "3s"  },
  { cx: "85%", cy: "46%", w: 170, h: 170, dur: "44s",  color: "rgba(165,180,252,0.22)", delay: "18s" },
];

export default function BackgroundCanvas() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {/* Fine line grid */}
      <svg className="absolute inset-0 w-full h-full st-grid" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="st-line-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ink-2)" strokeWidth="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#st-line-grid)" />
      </svg>

      {/* Dot accent overlay */}
      <svg className="absolute inset-0 w-full h-full st-dots" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="st-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.2" fill="var(--ink-2)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#st-dots)" />
      </svg>

      {/* Aurora blobs */}
      <div className="blob-tl" />
      <div className="blob-br" />
      <div className="blob-mid" />
      <div className="blob-tr" />

      {/* Light beams */}
      {BEAMS.map((b, i) => (
        <div
          key={i}
          className="bg-beam"
          style={{
            top: b.top,
            "--beam-dur": b.dur,
            "--beam-delay": b.delay,
            "--beam-op": b.op,
          } as React.CSSProperties}
        />
      ))}

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            width: p.s,
            height: p.s,
            background: p.c,
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
            "--spin-dur": r.dur,
            animationDelay: r.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

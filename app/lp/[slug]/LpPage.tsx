"use client";

import { useEffect, useState } from "react";
import type { LandingPageContent } from "@/types";

interface Props { content: LandingPageContent; }

function parseHeroStat(stat: string | undefined) {
  if (!stat) return { prefix: "", num: 0, suffix: "" };
  const prefix = stat.startsWith("$") ? "$" : "";
  const suffix = /M\b/.test(stat) ? "M" : /K\b/.test(stat) ? "K" : stat.includes("%") ? "%" : stat.includes("×") ? "×" : stat.includes("x") ? "x" : "";
  const num = parseFloat(stat.replace(/[^0-9.]/g, "")) || 0;
  return { prefix, num, suffix };
}

function fmtNum(n: number, prefix: string, suffix: string): string {
  const s = (suffix === "M" || suffix === "K") ? n.toFixed(1) : Math.round(n).toString();
  return `${prefix}${s}${suffix}`;
}

export default function LpPage({ content }: Props) {
  const isRich = !!(content.heroStat || content.problems?.length || content.features?.length);
  const { prefix, num: heroNum, suffix } = parseHeroStat(content.heroStat);
  const [heroDisplay, setHeroDisplay] = useState(fmtNum(0, prefix, suffix));

  // Hero stat count-up on mount
  useEffect(() => {
    if (!heroNum) return;
    const dur = 2000;
    let raf: number;
    const id = setTimeout(() => {
      const t0 = performance.now();
      const frame = (now: number) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setHeroDisplay(fmtNum(eased * heroNum, prefix, suffix));
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }, 600);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, [heroNum, prefix, suffix]);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll(".lp-reveal, .lp-stagger");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in")); return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Stat counter animations
  useEffect(() => {
    if (!content.stats?.length) return;
    const els = document.querySelectorAll<HTMLElement>(".lp-stat-num[data-target]");
    if (!els.length || !("IntersectionObserver" in window)) return;
    let rfs: number[] = [];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const target = parseFloat(el.dataset.target ?? "0") || 0;
        const pre = el.dataset.prefix ?? "";
        const suf = el.dataset.suffix ?? "";
        const hasDot = (el.dataset.target ?? "").includes(".");
        const dur = 1400; const t0 = performance.now();
        const frame = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          const v = (1 - Math.pow(1 - p, 3)) * target;
          el.textContent = pre + (hasDot ? v.toFixed(1) : Math.round(v).toString()) + suf;
          if (p < 1) rfs.push(requestAnimationFrame(frame));
        };
        rfs.push(requestAnimationFrame(frame));
        io.unobserve(el);
      }),
      { threshold: 0.5 }
    );
    els.forEach((el) => io.observe(el));
    return () => { io.disconnect(); rfs.forEach(cancelAnimationFrame); };
  }, [content.stats]);

  const ticker = content.tickerItems ?? [];
  const doubled = [...ticker, ...ticker];

  const tagCls: Record<string, string> = {
    live: "lp-tag-live", opportunity: "lp-tag-opp", action: "lp-tag-action",
  };

  return (
    <>
      <style>{LP_CSS}</style>
      <div className="lp-root">
        <div className="lp-bg" aria-hidden />
        <div className="lp-glow-tl" aria-hidden />
        <div className="lp-glow-br" aria-hidden />

        {/* ── Nav ─────────────────────────────────── */}
        <nav className="lp-nav">
          <span className="lp-logo-text">{content.senderCompany || "SignalTrace"}</span>
          <a href={content.ctaUrl || "#cta"} className="lp-nav-cta">Schedule a Call →</a>
        </nav>

        {/* ── Hero ────────────────────────────────── */}
        <div className="lp-hero-wrap">
          <div className={`lp-hero${isRich ? "" : " lp-hero-single"}`}>
            <div className="lp-hero-copy">
              {content.logoUrl && (
                <div className="lp-logo-badge">
                  <img src={content.logoUrl} alt="Company logo" className="lp-logo-badge-img" />
                  {content.designTrend && <span className="lp-logo-trend">{content.designTrend}</span>}
                </div>
              )}
              <div className="lp-eyebrow">
                <span className="lp-eyebrow-dot" />
                Signal detected · {content.senderCompany || "SignalTrace"}
              </div>
              <h1 className="lp-h1">{content.headline}</h1>
              <p className="lp-hero-sub">{content.body || content.subheadline}</p>
              <div className="lp-hero-ctas">
                <a href={content.ctaUrl || "#cta"} className="lp-btn lp-btn-primary">{content.ctaText || "Book a 20-min call"} →</a>
                <a href="#why" className="lp-btn lp-btn-ghost">See why it matters</a>
              </div>
            </div>

            {isRich && content.heroStat && (
              <div className="lp-widget">
                <div className="lp-widget-header">
                  <span className="lp-widget-title">Signal Intelligence · {content.senderCompany || "Report"}</span>
                  <div className="lp-live-wrap"><div className="lp-live-dot" />Live</div>
                </div>
                <div className="lp-big-num-wrap">
                  <div className="lp-big-num-label">{content.heroStatLabel ?? "Opportunity from this signal"}</div>
                  <div className="lp-big-num">{heroDisplay}</div>
                  <div className="lp-big-num-sub">{content.heroStatSub ?? ""}</div>
                </div>
                {content.heroMetrics && content.heroMetrics.length > 0 && (
                  <div className="lp-metrics">
                    {content.heroMetrics.map((m, i) => (
                      <div key={i} className="lp-metric-row">
                        <span className="lp-metric-label">{m.label}</span>
                        <span className="lp-metric-value">{m.value}</span>
                        <span className={`lp-tag ${tagCls[m.tag] ?? "lp-tag-opp"}`}>{m.tag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Ticker ──────────────────────────────── */}
        {ticker.length > 0 && (
          <div className="lp-ticker-wrap" aria-hidden>
            <div className="lp-ticker-track">
              {doubled.map((item, i) => {
                const parts = item.split(/(\$?[\d,.]+[KMB%×x]?)/g);
                return (
                  <span key={i} className="lp-ticker-item">
                    <span className="lp-ticker-dot" />
                    {parts.map((part, j) =>
                      /\d/.test(part) ? <strong key={j}>{part}</strong> : part
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stats ───────────────────────────────── */}
        {content.stats && content.stats.length > 0 && (
          <section className="lp-section" id="why">
            <div className="lp-stats-grid lp-stagger">
              {content.stats.map((s, i) => {
                const raw = s.value.replace(/[^0-9.]/g, "");
                const pre = s.value.startsWith("$") ? "$" : "";
                const suf = s.value.replace(/^[$]?[\d.]+/, "");
                return (
                  <div key={i} className="lp-stat-item">
                    <span className="lp-stat-num" data-target={raw} data-prefix={pre} data-suffix={suf}>{s.value}</span>
                    <p className="lp-stat-label">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Problems ────────────────────────────── */}
        {content.problems && content.problems.length > 0 && (
          <>
            <hr className="lp-divider" />
            <section className="lp-section">
              <div className="lp-section-inner">
                <div className="lp-s-eye lp-reveal">The Challenge</div>
                <h2 className="lp-h2 lp-reveal">{content.problemHeadline ?? "Why the timing matters right now"}</h2>
                <div className="lp-problem-grid lp-stagger">
                  {content.problems.map((p, i) => (
                    <div key={i} className="lp-prob-cell">
                      <span className="lp-prob-icon">{p.icon}</span>
                      <h3>{p.title}</h3>
                      <p>{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ── How it works ────────────────────────── */}
        {content.steps && content.steps.length > 0 && (
          <>
            <hr className="lp-divider" />
            <section className="lp-section">
              <div className="lp-section-inner lp-narrow">
                <div className="lp-s-eye lp-reveal">How It Works</div>
                <h2 className="lp-h2 lp-reveal">{content.stepsHeadline ?? "From conversation to results — fast"}</h2>
                <div className="lp-timeline lp-stagger">
                  {content.steps.map((s, i) => (
                    <div key={i} className="lp-tl-item">
                      <div className="lp-tl-num">{i + 1}</div>
                      <div className="lp-tl-body">
                        <h3>{s.title}</h3>
                        <p>{s.description}</p>
                        {s.timing && <span className="lp-tl-time">{s.timing}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ── Features ────────────────────────────── */}
        {content.features && content.features.length > 0 && (
          <>
            <hr className="lp-divider" />
            <section className="lp-section">
              <div className="lp-section-inner">
                <div className="lp-s-eye lp-reveal">What We Deliver</div>
                <h2 className="lp-h2 lp-reveal">{content.featuresHeadline ?? "Everything your team needs to move fast"}</h2>
                <div className="lp-feat-grid lp-stagger">
                  {content.features.map((f, i) => (
                    <div key={i} className="lp-feat-cell">
                      <div className="lp-feat-icon">{f.icon}</div>
                      <h3>{f.title}</h3>
                      <p>{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ── Testimonials ────────────────────────── */}
        {content.testimonials && content.testimonials.length > 0 && (
          <>
            <hr className="lp-divider" />
            <section className="lp-section">
              <div className="lp-section-inner">
                <div className="lp-s-eye lp-reveal">What Teams Are Saying</div>
                <h2 className="lp-h2 lp-reveal">Results that speak for themselves</h2>
                <div className="lp-quotes-grid lp-stagger" style={{ marginTop: "2.5rem" }}>
                  {content.testimonials.map((t, i) => (
                    <div key={i} className="lp-quote-card">
                      <div className="lp-q-mark">&ldquo;</div>
                      <p className="lp-q-text">{t.text}</p>
                      <div className="lp-q-author">
                        <div className="lp-avatar">{t.initials}</div>
                        <div>
                          <div className="lp-q-name">{t.name}</div>
                          <div className="lp-q-role">{t.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ── CTA ─────────────────────────────────── */}
        <section className="lp-section" id="cta">
          <div className="lp-cta-wrap lp-reveal">
            <div className="lp-s-eye" style={{ justifyContent: "center", marginBottom: "1rem" }}>Get Started</div>
            <h2 className="lp-h2 lp-cta-h2">{content.ctaHeadline ?? "Ready to talk?"}</h2>
            <p className="lp-cta-sub">{content.ctaSub ?? content.subheadline}</p>
            {content.ctaUrl ? (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.85rem" }}>
                <a href={content.ctaUrl} className="lp-btn lp-btn-primary" style={{ fontSize: "1rem", padding: "0.9rem 2rem" }}>
                  {content.ctaText || "Book a 20-min call"} →
                </a>
              </div>
            ) : (
              <div className="lp-form-row">
                <input className="lp-form-input" type="email" placeholder="your@company.com" />
                <button className="lp-btn lp-btn-primary">{content.ctaText || "Get in touch"}</button>
              </div>
            )}
            <p className="lp-form-note">No commitment required. Response within 1 business day.</p>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────── */}
        <footer className="lp-footer">
          <span className="lp-footer-brand">{content.senderCompany || "SignalTrace"}</span>
          <p>This page was created specifically for you.</p>
          <p>Powered by SignalTrace</p>
        </footer>
      </div>
    </>
  );
}

const LP_CSS = `
.lp-root {
  --lp-bg:        #07080f;
  --lp-surface:   #0d0f1c;
  --lp-border:    rgba(99,102,241,0.14);
  --lp-border-hi: rgba(99,102,241,0.32);
  --lp-primary:   #6366F1;
  --lp-primary-br:#818CF8;
  --lp-accent:    #A78BFA;
  --lp-green:     #10B981;
  --lp-text:      #eef0ff;
  --lp-muted:     #8a8cb8;
  --lp-dim:       #4e5070;
  --lp-radius:    14px;
  --lp-shadow:    0 24px 70px -20px rgba(0,0,0,0.8);
  background: var(--lp-bg);
  color: var(--lp-text);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  min-height: 100vh;
}
.lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.lp-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(99,102,241,0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,0.028) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 130% 55% at 50% 0%, #000 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 130% 55% at 50% 0%, #000 0%, transparent 70%);
}
.lp-glow-tl {
  position: fixed; top: -200px; left: -200px; width: 700px; height: 700px;
  border-radius: 50%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%);
}
.lp-glow-br {
  position: fixed; bottom: -180px; right: -100px; width: 580px; height: 580px;
  border-radius: 50%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%);
}

/* NAV */
.lp-nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 6%; height: 64px;
  background: rgba(7,8,15,0.84);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border-bottom: 1px solid var(--lp-border);
}
.lp-logo-text {
  font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--lp-primary-br), var(--lp-accent));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.lp-nav-cta {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.58rem 1.2rem; border-radius: 10px;
  background: linear-gradient(135deg, var(--lp-primary-br), var(--lp-primary));
  color: #fff; font-size: 0.84rem; font-weight: 700; text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 6px 20px -6px rgba(99,102,241,0.6);
}
.lp-nav-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 28px -6px rgba(99,102,241,0.75); }

/* BUTTONS */
.lp-btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.8rem 1.6rem; border-radius: 11px; font-size: 0.9rem; font-weight: 700;
  font-family: inherit; text-decoration: none; cursor: pointer; border: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.lp-btn-primary {
  background: linear-gradient(135deg, var(--lp-primary-br), var(--lp-primary)); color: #fff;
  box-shadow: 0 8px 24px -8px rgba(99,102,241,0.65);
}
.lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 32px -8px rgba(99,102,241,0.8); }
.lp-btn-ghost {
  background: transparent; color: var(--lp-muted); border: 1px solid var(--lp-border-hi);
}
.lp-btn-ghost:hover { color: var(--lp-text); border-color: rgba(99,102,241,0.55); background: rgba(99,102,241,0.08); }

/* HERO */
.lp-hero-wrap { position: relative; z-index: 1; }
.lp-hero {
  max-width: 1240px; margin: 0 auto; padding: 6rem 6% 5rem;
  display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center;
  position: relative; z-index: 1;
}
.lp-hero-single { grid-template-columns: 1fr; max-width: 760px; }
.lp-hero-single .lp-hero-ctas { justify-content: flex-start; }
.lp-logo-badge {
  display: flex; align-items: center; gap: 1.2rem;
  margin-bottom: 2rem; padding: 1rem 1.2rem;
  border-radius: 16px; background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.3);
  width: fit-content;
  animation: lp-fade-up 0.6s cubic-bezier(.2,.8,.2,1) both;
}
.lp-logo-badge-img {
  height: 48px; width: 48px; object-fit: contain; border-radius: 10px; flex-shrink: 0;
}
.lp-logo-trend {
  font-size: 0.75rem; font-weight: 700; color: var(--lp-primary-br);
  letter-spacing: 0.08em; text-transform: capitalize;
}
.lp-eyebrow {
  display: inline-flex; align-items: center; gap: 0.6rem;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase;
  color: var(--lp-primary-br); margin-bottom: 1.5rem;
}
.lp-eyebrow-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--lp-green);
  box-shadow: 0 0 10px var(--lp-green); flex-shrink: 0;
  animation: lp-dot-pulse 2.5s ease-in-out infinite;
}
@keyframes lp-dot-pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
.lp-h1 {
  font-size: clamp(2rem, 3.5vw, 3.1rem); font-weight: 800; line-height: 1.1;
  letter-spacing: -0.03em; margin-bottom: 1.4rem;
}
.lp-h1 em { font-style: italic; color: var(--lp-primary-br); }
.lp-hero-sub { font-size: 1.05rem; color: var(--lp-muted); line-height: 1.72; margin-bottom: 2.2rem; max-width: 500px; }
.lp-hero-ctas { display: flex; gap: 0.85rem; flex-wrap: wrap; }

/* HERO WIDGET */
.lp-widget {
  border-radius: 20px; border: 1px solid var(--lp-border-hi);
  background: linear-gradient(160deg, #0f1220 0%, #0b0d1a 100%);
  box-shadow: var(--lp-shadow), 0 0 0 1px rgba(99,102,241,0.06);
  padding: 1.5rem; overflow: hidden;
  animation: lp-fade-up 0.85s cubic-bezier(.2,.8,.2,1) 0.18s both;
}
.lp-widget-header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 1rem; margin-bottom: 1.2rem; border-bottom: 1px solid var(--lp-border);
}
.lp-widget-title { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--lp-dim); }
.lp-live-wrap { display: flex; align-items: center; gap: 0.4rem; font-size: 0.65rem; font-weight: 700; color: var(--lp-green); }
.lp-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--lp-green); box-shadow: 0 0 8px var(--lp-green); animation: lp-dot-pulse 2.5s ease-in-out infinite; }
.lp-big-num-wrap { text-align: center; padding: 1rem 0 0.9rem; }
.lp-big-num-label { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lp-dim); margin-bottom: 0.5rem; }
.lp-big-num {
  font-size: 3.8rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1;
  background: linear-gradient(135deg, var(--lp-primary-br), var(--lp-accent));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.lp-big-num-sub { font-size: 0.7rem; color: var(--lp-dim); margin-top: 0.4rem; line-height: 1.5; }
.lp-metrics { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1.1rem; }
.lp-metric-row {
  display: flex; align-items: center; gap: 0.7rem;
  background: rgba(255,255,255,0.02); border: 1px solid var(--lp-border);
  border-radius: 10px; padding: 0.6rem 0.8rem;
}
.lp-metric-label { flex: 1; font-size: 0.75rem; color: var(--lp-muted); }
.lp-metric-value { font-size: 0.78rem; font-weight: 700; color: var(--lp-text); }
.lp-tag { font-size: 0.58rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 99px; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.06em; }
.lp-tag-live    { color: var(--lp-green); background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); }
.lp-tag-opp     { color: var(--lp-primary-br); background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); }
.lp-tag-action  { color: var(--lp-accent); background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.3); }

/* TICKER */
.lp-ticker-wrap {
  position: relative; z-index: 1;
  border-top: 1px solid var(--lp-border); border-bottom: 1px solid var(--lp-border);
  background: var(--lp-surface); overflow: hidden; height: 42px;
}
.lp-ticker-track {
  display: flex; align-items: center; height: 100%;
  animation: lp-ticker 36s linear infinite; width: max-content; white-space: nowrap;
}
@keyframes lp-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
.lp-ticker-item { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0 2.5rem; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--lp-dim); }
.lp-ticker-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--lp-primary); flex-shrink: 0; }
.lp-ticker-item strong { color: var(--lp-primary-br); }

/* STATS */
.lp-stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  max-width: 1240px; margin: 0 auto; padding: 0 6%;
  border-left: 1px solid var(--lp-border); position: relative; z-index: 1;
}
.lp-stat-item {
  padding: 3rem 2rem;
  border-right: 1px solid var(--lp-border);
  border-top: 1px solid var(--lp-border);
  border-bottom: 1px solid var(--lp-border);
  position: relative; overflow: hidden; transition: background 0.3s;
}
.lp-stat-item:hover { background: rgba(99,102,241,0.04); }
.lp-stat-item::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--lp-primary), transparent);
  opacity: 0; transition: opacity 0.3s;
}
.lp-stat-item:hover::after { opacity: 1; }
.lp-stat-num { font-size: 2.8rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: var(--lp-primary-br); display: block; margin-bottom: 0.5rem; }
.lp-stat-label { font-size: 0.8rem; color: var(--lp-muted); line-height: 1.5; }

/* SECTIONS */
.lp-section { position: relative; z-index: 1; }
.lp-section-inner { max-width: 1240px; margin: 0 auto; padding: 6rem 6%; }
.lp-narrow { max-width: 880px; }
.lp-s-eye {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--lp-primary-br); margin-bottom: 1.1rem;
  display: flex; align-items: center; gap: 0.7rem;
}
.lp-s-eye::after { content: ''; width: 28px; height: 1px; background: var(--lp-primary-br); opacity: 0.4; }
.lp-h2 { font-size: clamp(1.9rem, 3.2vw, 2.65rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 0.9rem; }
.lp-h2 em { font-style: italic; color: var(--lp-primary-br); }
.lp-s-sub { font-size: 1rem; color: var(--lp-muted); max-width: 520px; line-height: 1.72; margin-bottom: 3rem; }
.lp-divider { border: none; border-top: 1px solid var(--lp-border); position: relative; z-index: 1; }

/* PROBLEMS */
.lp-problem-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; background: var(--lp-border); border: 1px solid var(--lp-border); border-radius: 16px; overflow: hidden; }
.lp-prob-cell { background: var(--lp-bg); padding: 2rem 1.8rem; transition: background 0.25s; }
.lp-prob-cell:hover { background: var(--lp-surface); }
.lp-prob-icon { font-size: 1.5rem; margin-bottom: 0.8rem; display: block; }
.lp-prob-cell h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.4rem; letter-spacing: -0.01em; color: var(--lp-text); }
.lp-prob-cell p { font-size: 0.875rem; color: var(--lp-muted); line-height: 1.7; }

/* TIMELINE */
.lp-timeline { position: relative; }
.lp-timeline::before { content: ''; position: absolute; left: 17px; top: 20px; bottom: 20px; width: 1px; background: linear-gradient(180deg, var(--lp-primary) 0%, transparent 100%); opacity: 0.2; }
.lp-tl-item { display: flex; gap: 2.2rem; padding-bottom: 2.8rem; }
.lp-tl-item:last-child { padding-bottom: 0; }
.lp-tl-num { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; background: var(--lp-surface); border: 1px solid var(--lp-border-hi); display: flex; align-items: center; justify-content: center; font-size: 0.88rem; font-weight: 800; color: var(--lp-primary-br); position: relative; z-index: 1; margin-top: 2px; }
.lp-tl-body h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: 0.4rem; letter-spacing: -0.01em; padding-top: 0.35rem; color: var(--lp-text); }
.lp-tl-body p { font-size: 0.875rem; color: var(--lp-muted); line-height: 1.7; max-width: 460px; }
.lp-tl-time { display: inline-block; margin-top: 0.65rem; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--lp-primary-br); padding: 0.15rem 0.55rem; border-radius: 99px; border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.08); }

/* FEATURES */
.lp-feat-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; background: var(--lp-border); border: 1px solid var(--lp-border); border-radius: 16px; overflow: hidden; }
.lp-feat-cell { background: var(--lp-bg); padding: 2.1rem 1.9rem; transition: background 0.25s; }
.lp-feat-cell:hover { background: var(--lp-surface); }
.lp-feat-icon { width: 42px; height: 42px; border-radius: 11px; border: 1px solid var(--lp-border-hi); background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; margin-bottom: 1rem; transition: transform 0.25s cubic-bezier(.2,.8,.2,1); }
.lp-feat-cell:hover .lp-feat-icon { transform: scale(1.1) rotate(4deg); }
.lp-feat-cell h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.4rem; letter-spacing: -0.01em; color: var(--lp-text); }
.lp-feat-cell p { font-size: 0.85rem; color: var(--lp-muted); line-height: 1.65; }

/* QUOTES */
.lp-quotes-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 1.2rem; }
.lp-quote-card { border-radius: var(--lp-radius); padding: 1.8rem; background: var(--lp-surface); border: 1px solid var(--lp-border); display: flex; flex-direction: column; transition: border-color 0.25s, box-shadow 0.25s; }
.lp-quote-card:hover { border-color: var(--lp-border-hi); box-shadow: 0 12px 40px -16px rgba(99,102,241,0.25); }
.lp-q-mark { font-size: 3rem; line-height: 0.7; color: var(--lp-primary-br); opacity: 0.25; margin-bottom: 0.8rem; font-weight: 800; }
.lp-q-text { font-size: 0.9rem; color: var(--lp-text); line-height: 1.75; flex: 1; margin-bottom: 1.3rem; }
.lp-q-author { display: flex; align-items: center; gap: 0.75rem; }
.lp-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, var(--lp-primary-br), var(--lp-accent)); display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #fff; }
.lp-q-name { font-size: 0.83rem; font-weight: 700; color: var(--lp-text); }
.lp-q-role { font-size: 0.7rem; color: var(--lp-dim); }

/* CTA */
.lp-cta-wrap { margin: 0 6% 6rem; border-radius: 22px; position: relative; overflow: hidden; background: linear-gradient(140deg, rgba(99,102,241,0.12) 0%, var(--lp-surface) 55%, rgba(139,92,246,0.06) 100%); border: 1px solid var(--lp-border-hi); padding: 5rem 3rem; text-align: center; z-index: 1; }
.lp-cta-wrap::before { content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%); width: 600px; height: 380px; background: radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%); pointer-events: none; }
.lp-cta-wrap > * { position: relative; }
.lp-cta-h2 { margin-bottom: 0.9rem; }
.lp-cta-sub { font-size: 1rem; color: var(--lp-muted); max-width: 520px; margin: 0 auto 2rem; line-height: 1.72; }
.lp-form-row { display: flex; gap: 0.65rem; max-width: 460px; margin: 0 auto 0.85rem; }
.lp-form-input { flex: 1; padding: 0.78rem 1rem; border-radius: 10px; border: 1px solid var(--lp-border-hi); background: rgba(7,8,15,0.6); color: var(--lp-text); font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
.lp-form-input:focus { border-color: var(--lp-primary-br); box-shadow: 0 0 0 3px rgba(99,102,241,0.18); }
.lp-form-input::placeholder { color: var(--lp-dim); }
.lp-form-note { font-size: 0.72rem; color: var(--lp-dim); }

/* FOOTER */
.lp-footer { border-top: 1px solid var(--lp-border); padding: 2rem 6%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; position: relative; z-index: 1; }
.lp-footer p { font-size: 0.72rem; color: var(--lp-dim); }
.lp-footer-brand { font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; color: var(--lp-dim); }

/* ANIMATIONS */
@keyframes lp-fade-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
.lp-hero-copy .lp-eyebrow { animation: lp-fade-up 0.6s cubic-bezier(.2,.8,.2,1) 0.1s both; }
.lp-hero-copy .lp-h1      { animation: lp-fade-up 0.7s cubic-bezier(.2,.8,.2,1) 0.22s both; }
.lp-hero-sub               { animation: lp-fade-up 0.7s cubic-bezier(.2,.8,.2,1) 0.34s both; }
.lp-hero-ctas              { animation: lp-fade-up 0.7s cubic-bezier(.2,.8,.2,1) 0.46s both; }
.lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(.2,.8,.2,1), transform 0.6s cubic-bezier(.2,.8,.2,1); }
.lp-reveal.in { opacity: 1; transform: none; }
.lp-stagger > * { opacity: 0; transform: translateY(16px); transition: opacity 0.55s cubic-bezier(.2,.8,.2,1), transform 0.55s cubic-bezier(.2,.8,.2,1); }
.lp-stagger.in > * { opacity: 1; transform: none; }
.lp-stagger.in > *:nth-child(2) { transition-delay: 0.08s; }
.lp-stagger.in > *:nth-child(3) { transition-delay: 0.16s; }
.lp-stagger.in > *:nth-child(4) { transition-delay: 0.24s; }

/* RESPONSIVE */
@media (max-width: 1024px) {
  .lp-hero { grid-template-columns: 1fr; gap: 3rem; }
  .lp-widget { max-width: 480px; }
  .lp-stats-grid { grid-template-columns: repeat(2,1fr); }
  .lp-quotes-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .lp-hero { padding: 4rem 5% 3.5rem; }
  .lp-problem-grid { grid-template-columns: 1fr; }
  .lp-feat-grid { grid-template-columns: 1fr; }
  .lp-form-row { flex-direction: column; }
  .lp-cta-wrap { padding: 3.5rem 1.5rem; margin: 0 4% 4rem; }
}
@media (max-width: 520px) {
  .lp-stats-grid { grid-template-columns: 1fr; }
  .lp-h1 { font-size: 1.85rem; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-reveal, .lp-stagger > *, .lp-widget, .lp-hero-copy .lp-eyebrow, .lp-hero-copy .lp-h1, .lp-hero-sub, .lp-hero-ctas { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }
}
`;

# SignalTrace — Complete Project Reference

> Signal-powered cold email tool. Finds live buying signals for a prospect, generates a hyper-personalised email + landing page, then pushes to Apollo CRM and Slack — all in one flow.

---

## Quick Start (every time)

```bash
# 1. Kill any stale Node processes (if port conflicts)
taskkill /f /im node.exe       # Windows

# 2. Start dev server
cd "C:\Users\LENOVO\Downloads\SignalTrace"
npm run dev

# 3. Open the URL shown in terminal — usually http://localhost:3000
```

> If port 3000 is taken, Next.js picks the next free port (3001, 3002 …). Always read the terminal output for the actual URL.

---

## Environment Variables (.env.local)

Create `.env.local` in the project root with these keys:

```env
# Exa — signal & people search
EXA_API_KEY=your_exa_api_key

# Groq — LLaMA 3.3 70B for email/LP generation
GROQ_API_KEY=your_groq_api_key

# Upstash Redis — history & LP storage
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Apollo.io v1 — CRM push
APOLLO_API_KEY=your_apollo_api_key

# Slack — webhook for push notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# App base URL (for LP links)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, TypeScript) |
| Styling | Tailwind CSS v3 + custom CSS variables |
| Fonts | Plus Jakarta Sans (display) · JetBrains Mono (code) |
| AI / LLM | Groq `llama-3.3-70b-versatile` |
| Signal search | Exa (web search API) |
| CRM push | Apollo.io v1 REST API |
| Notifications | Slack Incoming Webhook |
| Storage | Upstash Redis (history + landing pages) |
| State | React `useState` + localStorage (settings) |

---

## Project Structure

```
SignalTrace/
├── app/
│   ├── layout.tsx          # Root layout — fonts, theme init script
│   ├── page.tsx            # Main app page (single + bulk flows)
│   ├── globals.css         # Design tokens, animations, dark mode
│   ├── history/
│   │   └── page.tsx        # History list page
│   ├── lp/
│   │   └── [slug]/
│   │       └── page.tsx    # Public landing page (prospect-facing)
│   └── api/
│       ├── people/         # Exa people search
│       ├── signals/        # Exa signal search + duplicate check
│       ├── generate/       # Groq email + LP generation
│       ├── lp/             # LP create/update in Redis
│       ├── history/        # Redis history read/write
│       ├── discover/       # ICP company discovery
│       ├── push/
│       │   ├── apollo/     # Apollo CRM push
│       │   └── slack/      # Slack webhook push
│       └── bulk/           # Bulk generation orchestrator
│
├── components/
│   ├── BackgroundCanvas.tsx   # Fixed bg: dot grid + blobs + particles + rings
│   ├── HeroBanner.tsx         # Hero section shown on idle state
│   ├── Logo.tsx               # ECG mark + "SignalTrace" wordmark
│   ├── ThemeToggle.tsx        # Dark/light mode toggle (localStorage)
│   ├── EcgLoader.tsx          # ECG trace loading animation
│   ├── SettingsBar.tsx        # Sender profile (company, name, CTA URL)
│   ├── ProspectForm.tsx       # Manual prospect entry form
│   ├── PeoplePicker.tsx       # People grid from Exa company lookup
│   ├── CompanyDiscovery.tsx   # ICP match / filter / CSV import
│   ├── SignalPicker.tsx        # Signal cards (person + company)
│   ├── SubjectLineVariants.tsx # 3 subject line options
│   ├── QualityScores.tsx      # Animated score bars
│   ├── ReviewPanel.tsx        # Email + LP editor side-by-side
│   ├── PushButton.tsx         # Push to Apollo + Slack with warnings
│   └── HistoryTable.tsx       # History table with LP visit tracking
│
├── hooks/
│   └── useSettings.ts         # localStorage settings hook
│
├── lib/
│   ├── claude.ts              # Groq generation (email + LP + scores)
│   ├── exa.ts                 # Exa signal + people search
│   ├── apollo.ts              # Apollo CRM integration
│   ├── slack.ts               # Slack webhook
│   ├── redis.ts               # Upstash Redis client
│   ├── slugify.ts             # LP slug generation
│   ├── fuzzy.ts               # Fuzzy duplicate detection
│   └── logger.ts              # Logging utility
│
├── types/
│   └── index.ts               # All shared TypeScript types
│
├── tailwind.config.ts         # Design tokens (uses CSS vars for dark mode)
├── CLAUDE.md                  # This file
└── session-archive.html       # Full session log
```

---

## Design System

### CSS Variables (light / dark)

All semantic colors are CSS variables that flip automatically when `data-theme="dark"` is set on `<html>`.

```css
/* Light */              /* Dark */
--ink:     #11143A       --ink:     #ECEEFF    /* primary text */
--ink-2:   #32366A       --ink-2:   #C2C5F0    /* secondary text */
--ink-3:   #555888       --ink-3:   #9095D0    /* labels / captions */
--ink-4:   #777AAA       --ink-4:   #6668A8    /* subtle / placeholder */
--ice:     #F4F6FF       --ice:     #0C0E1D    /* page bg tint */
--mist:    #DFE3F8       --mist:    #1A1C38    /* borders */
--surface: #FFFFFF       --surface: #12142C    /* card backgrounds */
--input-bg               --input-bg            /* field backgrounds */
--input-border           --input-border        /* field borders */
```

### Brand Colors (fixed, Tailwind)

```
brand-50 → #EEF2FF    brand-400 → #818CF8
brand-100 → #E0E7FF   brand-500 → #6366F1
brand-300 → #A5B4FC   brand-600 → #4F46E5  ← primary action
brand-700 → #4338CA
```

### Key CSS Classes

| Class | Effect |
|---|---|
| `.glass` | Frosted glass card (auto dark mode) |
| `.gradient-text` | Animated indigo→violet gradient text |
| `.card-shimmer` | Shine effect on hover |
| `.card-lift` | Subtle translateY(-2px) on hover |
| `.live-ping` | Pulsing green dot animation |
| `.score-bar` | Animated bar that scales from 0 |
| `.hero-ecg-path` | ECG that draws itself once on load |
| `.ecg-path` | Looping ECG loader animation |
| `.animate-fade-up` | Entrance animation (fade + slide up) |

### Dark Mode

Dark mode is toggled by setting `data-theme="dark"` on `<html>`. The ThemeToggle component handles this and persists to `localStorage`. A script in `layout.tsx` reads `localStorage` before hydration to prevent flash.

**Rule for dark mode compatibility:**
- Never use `bg-white` — use `bg-[var(--surface)]`
- Never use `bg-white/X` — use `bg-[var(--input-bg)]` or CSS var equivalent
- Never use hardcoded light-mode Tailwind like `bg-brand-50`, `bg-amber-50`, `bg-violet-50` — use `bg-[var(--surface)]` with colored border/text instead
- Never use `text-brand-700`, `text-amber-700`, `text-emerald-700` on cards (dark text on dark bg) — use `text-brand-400`, `text-amber-500`, `text-emerald-500`

---

## App Flow

### Single Prospect

1. **Entry** — Type company name (Exa finds decision-makers) OR enter prospect manually
2. **People picker** — Select which person to target
3. **Signal picker** — Choose a buying signal (funding, news, hiring) or skip
4. **Generate** — Groq writes email + landing page + quality scores
5. **Review** — Edit email body and LP content inline
6. **Push** — Push to Apollo sequence + Slack notification

### Bulk Mode

1. Find companies via ICP description, filter builder, or CSV import
2. Set target role, auto-push toggle, min quality score
3. Hit "Generate all" — processes sequentially, shows live progress table

---

## Key Implementation Notes

### CTA URL Authority
Groq is instructed to always output `ctaUrl: ""`. After parsing, the server always overrides with `sender.defaultCtaUrl`. This means:
- If user has a default CTA URL set in settings → it's always applied
- If not → ctaUrl stays empty → PushButton shows amber warning requiring acknowledgement before push

### Sender Context
`SenderContext = { senderCompany, senderName, defaultCtaUrl }` flows from:
- `localStorage` via `useSettings` hook → page.tsx
- Sent in request body to `/api/generate` and `/api/bulk`
- Passed to `generateEmail()` in `lib/claude.ts`
- Woven into both email body prompt and LP generation prompt

### Duplicate Detection
Redis stores all pushed prospects. On signal fetch, `lib/fuzzy.ts` checks for name+company fuzzy match. If found, shows amber warning with date last contacted. User can dismiss and continue.

### Landing Pages
Each generated LP gets a slug (e.g. `stripe-jane-smith-2024`) and is stored in Redis. Live at `/lp/[slug]`. Edits in ReviewPanel update Redis on push. LP visit timestamps are tracked via a pixel/redirect.

---

## Commands

```bash
npm run dev      # Development server (hot reload)
npm run build    # Production build
npm run start    # Production server (after build)
npm run lint     # ESLint
npx tsc --noEmit # TypeScript check (no output = clean)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Port conflict / can't open | `taskkill /f /im node.exe` then `npm run dev` |
| "Module not found" | `npm install` |
| Dark mode flash on reload | Check `<script>` in `layout.tsx` runs before hydration |
| CTA URL warning not showing | Verify `sender.defaultCtaUrl` is empty string not undefined |
| Groq rate limit | Wait 60s, Groq free tier has RPM limits |
| Apollo push fails | Check `APOLLO_API_KEY` in `.env.local` |
| Redis errors | Check `UPSTASH_REDIS_REST_URL` + token in `.env.local` |

---

## Session History

All design and feature decisions from the build sessions are archived in `session-archive.html` in this directory.

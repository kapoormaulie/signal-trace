# SignalTrace — Complete Project Reference

> Signal-powered cold email tool. Finds live buying signals for a prospect, generates a hyper-personalised email + landing page, then pushes to Apollo (or any CRM via webhook) and Slack — all in one flow. Optional login syncs settings + history to an account.

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

> If port 3000 is taken, Next.js picks the next free port. Always read terminal output for the actual URL.

---

## Environment Variables (.env.local)

```env
EXA_API_KEY=your_exa_api_key
GROQ_API_KEY=your_groq_api_key
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
APOLLO_API_KEY=your_apollo_api_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
NEXT_PUBLIC_BASE_URL=http://localhost:3000
FULLENRICH_API_KEY=your_fullenrich_api_key       # optional — most accurate email enrichment
AIARK_API_KEY=your_aiark_api_key                 # optional — company search (Discovery) + person email lookup
OCEAN_API_KEY=your_ocean_api_key                 # optional — lookalike company search (Discovery)
FINDYMAIL_API_KEY=your_findymail_api_key         # optional — email finder/verifier (name + domain)
HUNTER_API_KEY=your_hunter_api_key               # optional — email finder/verifier (25 finds + 50 verifications/mo)
ANTHROPIC_API_KEY=your_anthropic_api_key         # optional — used for logo vision analysis (currently using file-size heuristics instead)
```

### Email Enrichment Priority (descending, in `/api/people`):
1. **FullEnrich cached** (95% confidence) — Results from async webhook enrichment, cached in Redis
2. **Hunter.io** (85% confidence) — Synchronous email finder/verifier
3. **Findymail** (88% confidence) — Synchronous name+domain finder (`lib/findymail.ts`); domain is guessed from the company name when the input isn't already a domain
4. **FullEnrich (sync)** (95% confidence) — Direct people-search call, separate from the cached-webhook tier above
5. **AI Ark** (92% confidence) — `lib/aiark.ts` `findEmailViaAiArk()`. Two possible paths: if a LinkedIn URL is already known (usually is, from Exa's people search), calls `POST /v1/people/export/single` with `{url}` directly; otherwise searches `POST /v1/people` by name+domain first to get an AI-Ark person ID, then exports that ID. Real emails come only from the export call — the search endpoint returns profile data but never an email.
6. **Hunter.io** (85% confidence) — second attempt, redundant with #2 (pre-existing, not cleaned up)
7. **Exa web search** (65% confidence) — Unverified web search extraction
8. **Apollo.io** (80% confidence) — Verified employee database match
9. **FullEnrich async** — People without emails queued for background enrichment; results arrive via webhook

**FullEnrich Flow**: When `/api/people` finds people without emails, they're automatically queued for FullEnrich bulk enrichment. Results arrive asynchronously via webhook at `/api/webhooks/fullenrich`, cached in Redis, and returned on subsequent searches.

### Company Discovery Sourcing (descending, in `/api/discover`, filter-builder mode only):
1. **Ocean.io** (`lib/ocean.ts`) — used only when the "Find companies like these" seed-domain field is filled in; hits `POST /v3/search/companies` with `companiesFilters.lookalikeDomains`. Note: despite Ocean's own published docs example showing a flat response, the live API wraps each result as `{ company: {...}, relevance }` — confirmed by testing directly against the real API.
2. **AI Ark** (`lib/aiark.ts` `searchCompaniesAiArk()`) — real structured filtering (industry/size/location/funding) against their 70M+ verified company database via `POST /v1/companies`, `X-TOKEN` header auth.
3. **Exa web search** — fallback when neither key is set, or if either API errors. Builds a fuzzy natural-language query from the filters and does a semantic web search — not real structured filtering.

The **ICP match** tab (free-text description, not structured filters) always uses Exa — that's a semantic-search job, not a filter job, so AI Ark/Ocean aren't a fit there.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, TypeScript) |
| Styling | Tailwind CSS v3 + custom CSS variables |
| Fonts | Plus Jakarta Sans (display) · JetBrains Mono (code) |
| AI / LLM | Groq `llama-3.3-70b-versatile` (max_tokens: 4096) |
| Signal search | Exa (web search API) |
| CRM push | Apollo.io v1 REST API |
| Notifications | Slack Incoming Webhook |
| Storage | Upstash Redis (history + landing pages + users/sessions/account settings + enrichment cache) |
| Duplicate detection | Fuse.js fuzzy match |
| State | React `useState` + localStorage (settings, logged-out) or account (logged-in) |
| Auth | Self-built email/password — Node `crypto.scrypt` hashing, Redis-backed session cookies (no new deps/services) |
| Email enrichment | FullEnrich (95%, async webhook) + Findymail (88%, sync) + AI Ark (92%, sync) + Hunter.io (85%, sync) + Apollo (80%) + Exa (65%) |
| Company discovery | Ocean.io (lookalike) + AI Ark (structured filters) + Exa (semantic ICP search) |

---

## Project Structure

```
SignalTrace/
├── app/
│   ├── layout.tsx              # Root layout — fonts, theme init script (anti-flash)
│   ├── page.tsx                # Main app page (single + bulk flows)
│   ├── globals.css             # Design tokens, ALL animations, dark mode vars
│   ├── history/
│   │   └── page.tsx            # History list page — scoped by userId (logged in) or deviceId
│   ├── login/
│   │   └── page.tsx            # Combined login/signup, tab toggle
│   ├── lp/
│   │   └── [slug]/
│   │       ├── page.tsx        # Server component — Redis visit logging + renders LpPage
│   │       └── LpPage.tsx      # CLIENT component — full premium standalone LP
│   └── api/
│       ├── people/             # Exa people search (+ FullEnrich/Findymail/AI Ark/Hunter/Apollo/Exa email waterfall)
│       ├── signals/            # Exa signal search + duplicate check
│       ├── generate/
│       │   ├── route.ts        # Groq email + LP generation (full package, one call)
│       │   └── variant/        # Groq on-demand alternate email body only (no LP) — cheap, 1024 max_tokens
│       ├── lp/                 # LP create/update in Redis
│       ├── history/            # Redis history read/write (?scopeId=deviceId|userId); PATCH tags replyStatus
│       ├── discover/           # Company discovery — Ocean.io/AI Ark (filter mode) or Exa (ICP mode / fallback)
│       ├── icp/                # GET/POST account-scoped ICP profile (requires session)
│       ├── settings/           # GET/POST account-scoped settings (requires session)
│       ├── auth/
│       │   └── {signup,login,logout,me}/route.ts
│       ├── push/
│       │   ├── apollo/         # Apollo CRM push (+ Hunter email fallback)
│       │   ├── crm/            # Generic CRM webhook relay (Zapier/Make/HubSpot/etc.)
│       │   └── slack/          # Slack webhook push
│       ├── webhooks/
│       │   └── fullenrich/     # FullEnrich async enrichment results receiver
│       └── bulk/               # Bulk generation orchestrator — 4-worker concurrency
│
├── components/
│   ├── BackgroundCanvas.tsx    # Fixed bg: line-grid + dot-grid + 4 blobs + 5 beams + 25 particles + 8 rings
│   ├── HeroBanner.tsx          # Hero (idle): "Signal-to-sequence in 60s" + animated demo card
│   ├── Logo.tsx                # ECG mark + wordmark
│   ├── ThemeToggle.tsx         # Dark/light toggle (localStorage)
│   ├── EcgLoader.tsx           # ECG loading animation
│   ├── SettingsBar.tsx         # Right-side drawer: Sender Profile + Integrations tabs
│   ├── ProspectForm.tsx        # Manual prospect entry
│   ├── PeoplePicker.tsx        # Exa people grid
│   ├── CompanyDiscovery.tsx    # ICP / filter / CSV import
│   ├── SignalPicker.tsx        # Signal cards
│   ├── SubjectLineVariants.tsx # 3 subject lines
│   ├── QualityScores.tsx       # Animated score bars
│   ├── ReviewPanel.tsx         # Email + LP editor (mobile: tab switcher)
│   ├── PushButton.tsx          # Push to Apollo/CRM (one required) + Slack — CSV download always available
│   └── HistoryTable.tsx        # History with LP visit counts + reply-status tagging dropdown
│
├── hooks/
│   ├── useSettings.ts          # localStorage (logged out) or /api/settings (logged in) settings hook
│   ├── useIcpProfile.ts        # localStorage (logged out) or /api/icp (logged in) ICP profile hook
│   └── useAuth.ts              # { user, loading, logout } — fetches /api/auth/me
│
├── lib/
│   ├── claude.ts               # Groq generation — email + full rich LP in one call, + on-demand body-only variant
│   ├── exa.ts                  # Exa search + people/person signals (7 parallel strategies)
│   ├── apollo.ts               # Apollo CRM + people search integration
│   ├── slack.ts                # Slack webhook
│   ├── crm.ts                  # Generic CRM webhook POST client
│   ├── hunter.ts               # Hunter.io email finder/verifier (optional, sync)
│   ├── findymail.ts            # Findymail email finder (optional, sync, name+domain)
│   ├── aiark.ts                # AI Ark — company search (Discovery) + person email lookup (search-then-export)
│   ├── ocean.ts                # Ocean.io — lookalike company search (Discovery)
│   ├── fullenrich.ts           # FullEnrich bulk enrichment (async webhook)
│   ├── logo.ts                 # Logo scraping + rebrand detection + design trend analysis
│   ├── auth.ts                 # scrypt password hashing + session cookie helpers
│   ├── csv.ts                  # CSV serializer + browser download trigger
│   ├── deviceId.ts             # localStorage UUID for logged-out history scoping
│   ├── redis.ts                # Upstash Redis — prospects, LPs, users/sessions/settings, enrichment cache
│   ├── slugify.ts              # LP slug
│   ├── fuzzy.ts                # Fuse.js duplicate detection
│   └── logger.ts               # Logging
│
├── types/
│   └── index.ts                # All shared types — LandingPageContent is rich (see below)
│
├── tailwind.config.ts          # CSS var-backed design tokens
├── sarah-retool.html           # Reference LP — currently MISSING from working tree (deleted, uncommitted, predates the auth/CRM session)
├── CLAUDE.md                   # This file
└── session-archive.html        # Full build session log
```

---

## Design System

### CSS Variables (globals.css) — flip on `data-theme="dark"` on `<html>`

```
                    Light       Dark
--ink:              #11143A     #ECEEFF    primary text
--ink-2:            #32366A     #C2C5F0    secondary
--ink-3:            #555888     #9095D0    labels
--ink-4:            #777AAA     #6668A8    placeholders
--ice:              #F4F6FF     #0C0E1D    page bg tint
--mist:             #DFE3F8     #1A1C38    borders
--surface:          #FFFFFF     #12142C    card backgrounds
--input-bg          rgba(255,255,255,0.8)  rgba(20,22,48,0.85)
--input-border      rgba(165,180,252,0.45) rgba(99,102,241,0.3)
--background:       #F0F3FF     #090B18    page background
```

### Brand Colors (Tailwind, fixed)

`brand-400 #818CF8` · `brand-500 #6366F1` · `brand-600 #4F46E5` · `brand-700 #4338CA`

### Dark Mode Rules — CRITICAL

| Never use | Use instead |
|---|---|
| `bg-white` | `bg-[var(--surface)]` |
| `bg-white/X` | `bg-[var(--input-bg)]` |
| `bg-brand-50`, `bg-amber-50` | `bg-[rgba(99,102,241,0.08)]` or similar low-opacity rgba |
| `text-brand-700`, `text-amber-700` | `text-brand-400`, `text-amber-500` |
| `hover:text-brand-700` | `hover:text-brand-400` |

### Theme Toggle Architecture

- `ThemeToggle.tsx` sets `data-theme` on `document.documentElement`, persists to `localStorage`
- `layout.tsx` has an inline `<script>` in `<head>` that reads `localStorage` before hydration → no flash

### Key CSS Classes

| Class | Effect |
|---|---|
| `.glass` | Frosted glass — `blur(32px) saturate(180%)`, inner top glow, hover lift + shadow |
| `.card-lift` | `translateY(-3px)` + brand colored shadow on hover |
| `.gradient-text` | Animated indigo→violet gradient |
| `.card-shimmer` | Shine sweep on hover |
| `.live-ping` | Pulsing green dot |
| `.score-bar` | Bar that animates from 0 |
| `.bg-beam` | Diagonal gradient ray sweeping across background |
| `.orbit-ring` | Spinning ellipse ring |
| `.particle` | Floating glowing dot |
| `.st-grid` / `.st-dots` | SVG grid / dot overlays (opacity varies by theme) |
| `.hero-ecg-path` | ECG draw-on-load (one-shot) |
| `.ecg-path` | Looping ECG animation |
| `.animate-fade-up` | Fade + slide up entrance |

---

## Background Canvas System (BackgroundCanvas.tsx)

Fixed behind everything. Layers bottom to top:

1. **Line grid SVG** (`.st-grid`) — 40px crosshatch, `opacity: 0.08` light / `0.045` dark
2. **Dot overlay SVG** (`.st-dots`) — 1.2px dots, `opacity: 0.07` light / `0.04` dark
3. **4 aurora blobs** (all use `blob-float` / `blob-float-alt` keyframes):
   - `.blob-tl` — indigo `#818CF8 → #6366F1`, 750px, top-left
   - `.blob-br` — violet `#A78BFA → #8B5CF6`, 650px, bottom-right
   - `.blob-mid` — sky `#38BDF8 → #0EA5E9`, 500px, center-right
   - `.blob-tr` — fuchsia `#E879F9 → #D946EF`, 580px, top-right
4. **5 beam lines** (`.bg-beam`) — thin gradient rays, `beam-sweep` keyframe, staggered 0–22s delays
5. **25 particles** (`.particle`) — indigo/violet/cyan dots, `particle-rise` keyframe, box-shadow glow
6. **8 orbit rings** (`.orbit-ring`) — spinning ellipses, `orbit-spin` keyframe, `drop-shadow` glow

Dark mode: blobs use deeper colors; orbit rings get `opacity: 0.45` dim.

---

## Settings Drawer (SettingsBar.tsx)

Right-side slide-in panel — NOT a full-screen overlay.

- **Width**: `w-full` mobile, `w-[440px]` desktop (`sm:w-[440px]`)
- **Animation**: `panel-slide-in` keyframe (translateX 100%→0)
- **Backdrop**: `backdrop-fade-in` keyframe + click to close
- **Trigger**: "Set up" button in header → `setDrawerOpen(true)` + `setTab("profile"|"integrations")`

### Tabs inside drawer

**Sender Profile tab**: company name, sender name, default CTA URL inputs.
Collapsible "Why this makes your emails work" accordion (`showWhy` state, chevron rotates).

**Integrations tab**:
- **Apollo / Other CRM** — ONE merged card, not two. Sub-tab toggle inside the card: "Apollo API key" vs "Want to connect a different CRM?" (`crmTab` state). Whichever is filled satisfies the CRM requirement — the red REQUIRED badge only shows if *neither* Apollo nor the CRM webhook is set (`eitherCrmConnected`). Apollo tab has its own collapsible "What this does" (`showApolloWhat`); CRM tab has its own (`showCrmWhat`).
- Slack webhook URL + collapsible "What this does" accordion (`showSlackWhat` state)
- Team email input — used to pre-fill the "notify team" mailto: link when Slack isn't connected

Settings stored via `useSettings(userId)`: `localStorage` when logged out, `/api/settings` (Redis, account-scoped) when logged in. Passed down to `PushButton`.

---

## PushButton Blocking Logic (PushButton.tsx)

Props: `apolloApiKey`, `slackWebhookUrl`, `crmWebhookUrl`, `teamEmail`, `onOpenIntegrations`, plus push handlers/status per service (Apollo, Slack, CRM).

| Condition | Behavior |
|---|---|
| Neither Apollo key nor CRM webhook set | **Hard block** — red "No CRM connected" warning, "Set up Integrations →" opens drawer, `canPush = false` |
| No Slack webhook | Soft amber notice + "Notify team via email instead" mailto: link (uses `teamEmail`) |
| Quality score < 6 on any dim | Amber warning + checkbox "Send it anyway" |
| No CTA URL on LP | Amber warning + checkbox "Continue without CTA URL" |
| Always available | "Download prospect report (CSV)" button — no integration required |

Push button label and the post-push status grid adapt to only the services actually configured (Apollo is skipped entirely at push time — not just hidden in the UI — if no key was filled in, rather than silently falling back to the server's `APOLLO_API_KEY`).

---

## Landing Page System

### LandingPageContent type (types/index.ts)

```typescript
// Core — always present
headline, subheadline, body, ctaText, ctaUrl, senderCompany

// Hero widget (optional — generated for new LPs)
heroStat, heroStatLabel, heroStatSub
heroMetrics: Array<{ label, value, tag: "live"|"opportunity"|"action" }>

// Page sections (all optional)
tickerItems: string[]
stats: Array<{ value, label }>
problemHeadline
problems: Array<{ icon, title, description }>
stepsHeadline
steps: Array<{ title, description, timing? }>
featuresHeadline
features: Array<{ icon, title, description }>
testimonials: Array<{ text, name, role, initials }>
ctaHeadline, ctaSub
```

Old LPs in Redis (only have `headline/subheadline/body/ctaText/ctaUrl`) still render — optional sections are skipped with `&&` guards.

### LP Page Files

`app/lp/[slug]/page.tsx` — **server component**:
- Reads LP content from Redis (`getLp(slug)`)
- Appends visit timestamp (`appendLpVisit`)
- Renders `<LpPage content={content} />`

`app/lp/[slug]/LpPage.tsx` — **client component**, full standalone marketing page:
- Dark design system (`#07080f` bg, indigo/violet palette) — completely independent of app theme
- All styles embedded as `const LP_CSS` string in `<style>` JSX tag
- `useEffect` for: hero stat count-up (2s), scroll reveal (IntersectionObserver), stats counter animation
- Sections rendered conditionally based on whether content fields exist

### LP Generation (lib/claude.ts)

Single Groq call (`max_tokens: 4096`) generates email + all LP content in one JSON output.
After parse: `result.landingPageContent.ctaUrl = sender.defaultCtaUrl` always overrides model output.
`result.landingPageContent.senderCompany = sender.senderCompany` is set server-side.

### LP Design Reference

`sarah-retool.html` in the project root is the design reference (gold/dark LP with all sections). `LpPage.tsx` replicates this structure with indigo/violet palette. **Note:** this file is currently missing from the working tree (deleted, uncommitted, predates the auth/CRM session) — `LpPage.tsx` itself is unaffected since the reference was only ever used for design inspiration, not imported at runtime.

---

## App Flow

### Single Prospect
1. Enter company → Exa finds decision-makers (email enriched via the waterfall in `/api/people` — see Email Enrichment Priority above)
2. Pick person (PeoplePicker)
3. Pick buying signal (SignalPicker) or skip
4. Generate → Groq outputs email + full LP; in review, optionally click "+ Generate another version" for up to 2 more alternate email-body angles (see Copy Variants below)
5. Review + edit (ReviewPanel — mobile has email/LP tab switcher)
6. Push → Apollo sequence and/or CRM webhook (one required) + Slack — blocked only if neither CRM target is configured

### Bulk Mode
1. Find companies via ICP / filters / CSV — discovery result count is user-chosen (10/20/50/100 pills or custom input, max 100); re-running a search excludes companies already added to the queue this session so you get a fresh set. Filter-builder mode sources from Ocean.io/AI Ark when configured (see Company Discovery Sourcing above); ICP-description mode always uses Exa.
2. Set role, auto-push toggle, min quality score
3. Generate all → **4-worker concurrency pool** (not sequential), live progress table, "Export CSV" once done

---

## ICP Profile Persistence

The ICP-match description and filter-builder fields (industry/size/location/funding/keywords/lookalike domains) persist across sessions instead of resetting to blank every time you open Discovery.

- `hooks/useIcpProfile.ts` — same shape as `useSettings.ts`: `localStorage` when logged out, `/api/icp` (Redis, key `user-icp:<userId>`) when logged in, seeds the account from local on first login
- `components/CompanyDiscovery.tsx` seeds its fields from the saved profile once on load (won't clobber active typing on re-renders), and saves whatever you searched with every time you click "Find companies" / "Find matching companies"
- Saved profile shows a small "Saved from your last search" hint under the ICP description field

## Copy Variants (on-demand)

A second full Groq call is deliberately **not** made automatically on every generation — only when the "+ Generate another version" button is clicked in review (Single mode only, no change to Bulk mode's cost profile).

- `lib/claude.ts` `generateEmailVariant()` — body-only Groq call (1024 max_tokens vs. the main call's 4096), explicitly prompted to differ in angle/tone/opening line from the previous version; skips landing-page regeneration entirely
- `app/api/generate/variant/route.ts` — the route
- `app/page.tsx` tracks `emailVariants[]` (capped at `MAX_EMAIL_VARIANTS = 3`) + `selectedVariantIdx`; switching variants preserves any hand-edits on the one you're leaving before switching
- `components/ReviewPanel.tsx` — "Version 1 / Version 2…" pills + the generate button, next to the email body header

## Reply Tracking

Manual outcome tagging per prospect in `/history`, rolled into a positive-reply-rate stat — the start of a feedback loop, not (yet) automated ingestion from Apollo/Instantly.

- `types/index.ts` `ReplyStatus` = `"positive" | "neutral" | "negative" | "bounced"`, stored as `ProspectRecord.replyStatus`
- `app/api/history/route.ts` `PATCH` — `{ id, replyStatus }`, merges into the existing Redis record via `getProspect` + `saveProspect`
- `components/HistoryTable.tsx` — colored dropdown per row in a new "Reply" column
- `app/history/page.tsx` — stat bar showing positive reply rate, tag counts vs. total contacted; optimistic UI update; reply status included in CSV export

---

## Auth & Account Sync

Login is **optional** — the app is fully usable logged out, exactly as before this feature was added.

- `/login` — combined login/signup page, tab toggle, `Continue without an account` escape hatch
- `lib/auth.ts` — `crypto.scrypt` password hashing (`salt:hash` hex, `timingSafeEqual` verify), opaque session tokens (`crypto.randomBytes(32)`)
- Sessions live in Redis (`session:<token>` → `userId`, 30-day TTL) behind an httpOnly/sameSite=lax cookie (`st_session`) — **not JWT**, so logout instantly revokes access and no `AUTH_SECRET` env var is needed
- `useAuth()` hook exposes `{ user, loading, logout }`, wired into the header (desktop nav + mobile dropdown)
- Logged in: `useSettings(userId)` reads/writes `/api/settings` instead of localStorage, one-time-seeding the account from local settings if the account has none yet
- Logged in: prospect pushes are tagged with `userId` (in addition to `deviceId`); `/history` fetches `?scopeId=<userId ?? deviceId>` — same generalized Redis sorted-set index (`prospects:index:<scopeId>`) works for both a device or an account
- Duplicate-prospect detection (`/api/signals`) still uses the **global** unscoped index — it must see everyone's history, not just one device/account

---

## FullEnrich Webhook Integration

### How it works

1. **Search triggers enrichment**: When `/api/people` finds 15-20 people but some lack emails, they're automatically queued for FullEnrich bulk enrichment
2. **Async enrichment**: `requestFullEnrichBulk()` submits them to `https://app.fullenrich.com/api/v2/contact/enrich/bulk` with webhook URL
3. **Webhook callback**: FullEnrich processes asynchronously and POSTs results to `/api/webhooks/fullenrich`
4. **Caching**: Results cached in Redis keyed by person ID (`fullenrich:person:{id}`)
5. **Subsequent searches**: Cached emails returned immediately with 95% confidence score

### API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `https://app.fullenrich.com/api/v2/contact/enrich/bulk` | POST | Submit batch enrichment (webhook callback URL required) |
| `https://signal-trace.vercel.app/api/webhooks/fullenrich` | POST | Receive enrichment results from FullEnrich |
| `/api/people?company=X` | GET | Triggers auto-enrichment for unfound emails |

### Request Format

FullEnrich expects:
```json
{
  "name": "SignalTrace-{timestamp}",
  "webhook_url": "https://signal-trace.vercel.app/api/webhooks/fullenrich",
  "data": [{
    "id": "person-id",
    "first_name": "John",
    "last_name": "Doe",
    "company_name": "Google"
  }]
}
```

### Response Fields Cached

- `email` — Work email address (95% confidence when verified)
- `source` — Always "fullenrich"
- `confidence` — Always 95
- `verified` — Always true
- `enrichedAt` — Timestamp of enrichment

### Environment Setup

Add to `.env.local` and Vercel → Project Settings → Environment Variables:
```env
FULLENRICH_API_KEY=your_api_key_uuid
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Or https://signal-trace.vercel.app in prod
```

---

## Hero Banner Copy (HeroBanner.tsx)

- Status pill: **"Signal Intelligence · Groq LLaMA 3.3 · Exa"**
- H1 gradient line: **"Signal-to-sequence"**
- H1 dark line: **"in under 60 seconds."**
- Sub-copy: "SignalTrace monitors the open web for live buying intent — Series raises, leadership changes, product launches — then autonomously drafts personalized outreach and enrolls each prospect directly into your Apollo sequence."
- Steps: **"Detect intent → Generate outreach → Enroll in sequence"**
- Feature pills: "Real-time intent detection" · "LLM-generated copy" · "Apollo sequence enrollment" · "Dynamic landing pages"

---

## Mobile Responsive

- Header: hamburger + dropdown on mobile (`mobileMenuOpen` state)
- Settings drawer: `w-full sm:w-[440px]`
- ReviewPanel: `mobilePanel: "email"|"lp"` tab switcher (hidden on `sm:`)
- HeroBanner demo card: `hidden lg:block`
- Quality/Angle grid: `grid-cols-1 sm:grid-cols-2`
- Bulk role grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- Bulk table: `overflow-x-auto` wrapper + `min-w-[640px]` table

---

## Vercel Deployment

- GitHub: `kapoormaulie/signal-trace` → auto-deploy on push to `main`
- Live URL: `https://signal-trace.vercel.app`
- **Always** run `npx tsc --noEmit` before committing — zero errors required
- New env vars added locally (e.g. `HUNTER_API_KEY`) must also be added in Vercel → Project → Settings → Environment Variables, then redeployed — `.env.local` is never read in production

---

## Commands

```bash
npm run dev          # Dev server with hot reload
npm run build        # Production build
npm run start        # Production server (after build)
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check (no output = clean)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Port conflict | `taskkill /f /im node.exe` then `npm run dev` |
| "Module not found" | `npm install` |
| Dev server 500s with `Cannot find module './XXX.js'` after a build | Running `next build` while `npm run dev` is still up corrupts the shared `.next` cache. Fix: `taskkill /f /im node.exe`, `rm -rf .next`, restart `npm run dev` |
| Dark mode flash on reload | Check inline `<script>` in `layout.tsx` runs before hydration |
| CTA URL warning missing | Verify `sender.defaultCtaUrl` is `""` not `undefined` |
| Groq rate limit | Wait 60 s — free tier has RPM limits |
| Apollo push fails | Check `APOLLO_API_KEY` in `.env.local` |
| Redis errors | Check `UPSTASH_REDIS_REST_URL` + token |
| LP page shows only hero | Old LP in Redis — optional sections only appear on newly generated LPs |
| TypeScript error | `npx tsc --noEmit` — never commit dirty |
| FullEnrich emails not appearing | Webhook not yet received. Results are async; check Redis cache after 2–5 min: `redis-cli GET fullenrich:person:{id}` |
| FullEnrich webhook 400 error | Check that `NEXT_PUBLIC_BASE_URL` is correct (must be publicly accessible, not localhost) |
| People search returns `emailConfidence: 0` | No emails found from any source; people queued for FullEnrich enrichment, check back after enrichment completes |
| AI Ark `429` rate limit in logs | 5 req/s, 300/min, 18,000/hr cap — the waterfall falls through to the next enrichment tier automatically, no action needed unless it's persistent |
| Discovery filter-builder returns Exa results instead of AI Ark/Ocean | Either the relevant key isn't set, or that API errored (check `logs/run.log` for `AI Ark error` / `Ocean.io error` — it falls back to Exa automatically rather than failing the request) |
| Ocean.io lookalike search returns nothing | Check `filters.lookalikeDomains` actually has comma-separated domains — this path only activates when seed domains are given, otherwise Discovery falls through to AI Ark/Exa |

---

## Session History

All design/feature decisions from build sessions are in `session-archive.html`:
- **Session 1**: Design/LP system
- **Session 2**: CRM alternatives, CSV export, auth + account sync, bulk concurrency, discovery count/exclude, Hunter.io enrichment
- **Session 3**: FullEnrich webhook integration (async bulk enrichment with Redis caching), auto-queueing unfound contacts for enrichment
- **Session 4**: ICP profile persistence, on-demand copy variants, reply tracking + positive-reply-rate stat, AI Ark company search (Discovery filter-builder), Ocean.io lookalike search (Discovery), Findymail email enrichment, fixed a pre-existing broken AI Ark person-lookup integration that was silently failing against a nonexistent host on every call

The design reference for LPs is `sarah-retool.html` (currently missing from disk — see LP Design Reference note above).

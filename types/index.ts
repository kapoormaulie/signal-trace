export interface Signal {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedDate?: string;
  type: "company" | "person";
}

export interface SubjectLine {
  text: string;
  reasoning: string;
}

export interface QualityScores {
  personalization: number; // 1–10
  clarity: number;         // 1–10
  cta: number;             // 1–10
}

export interface GenerationResult {
  emailBody: string;
  subjectLines: SubjectLine[];
  scores: QualityScores;
  angleReasoning: string;
  landingPageContent: LandingPageContent;
}

export interface LpMetric {
  label: string;
  value: string;
  tag: "live" | "opportunity" | "action";
}
export interface LpProblem  { icon: string; title: string; description: string; }
export interface LpStep     { title: string; description: string; timing?: string; }
export interface LpFeature  { icon: string; title: string; description: string; }
export interface LpStat     { value: string; label: string; }
export interface LpTestimonial { text: string; name: string; role: string; initials: string; }

export interface LandingPageContent {
  // Core (always present)
  headline: string;
  subheadline: string;
  body: string;
  ctaText: string;
  ctaUrl?: string;
  // Rich content — present on new LPs, undefined on old ones
  senderCompany?: string;
  heroStat?: string;
  heroStatLabel?: string;
  heroStatSub?: string;
  heroMetrics?: LpMetric[];
  tickerItems?: string[];
  stats?: LpStat[];
  problemHeadline?: string;
  problems?: LpProblem[];
  stepsHeadline?: string;
  steps?: LpStep[];
  featuresHeadline?: string;
  features?: LpFeature[];
  testimonials?: LpTestimonial[];
  ctaHeadline?: string;
  ctaSub?: string;
}

export interface ProspectRecord {
  id: string;
  name: string;
  company: string;
  email?: string;
  linkedinUrl?: string;
  emailBody: string;
  subjectLine: string;
  lpSlug: string;
  lpUrl: string;
  scores: QualityScores;
  signalUsed?: string;
  contactedAt: string; // ISO timestamp
  lpVisits: string[];  // ISO timestamps
  pushed: boolean;
}

export interface ProspectInput {
  name: string;
  company: string;
  email?: string;
  linkedinUrl?: string;
}

export interface PersonResult {
  id: string;
  name: string;
  title: string;
  linkedinUrl: string;
  summary: string;
  email?: string;
}

export type RunStage =
  | "idle"
  | "company-lookup"
  | "people-picker"
  | "duplicate-check"
  | "fetching-signals"
  | "signal-picker"
  | "generating"
  | "review"
  | "pushing"
  | "done";

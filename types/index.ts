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

export interface LandingPageContent {
  headline: string;
  subheadline: string;
  body: string;
  ctaText: string;
  ctaUrl?: string;
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

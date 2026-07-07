import crypto from "crypto";
import { log } from "./logger";
import { saveLogoHash, getLogoHash } from "./redis";

const LOGO_CACHE_TTL = 86400; // 24 hours

interface LogoData {
  url: string;
  hash: string;
  designTrend: string;
  isRebrand: boolean;
  analyzedAt: number;
}

function hashImage(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function scrapeLogoUrl(companyName: string, domain: string): Promise<string | null> {
  try {
    const url = `https://${domain}`;
    const response = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Check for Open Graph image
    const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogMatch?.[1]) return ogMatch[1];

    // Check for favicon
    const faviconMatch = html.match(/<link\s+rel="(?:icon|shortcut icon)"\s+href="([^"]+)"/i);
    if (faviconMatch?.[1]) {
      const href = faviconMatch[1];
      return href.startsWith("http") ? href : `${url}${href.startsWith("/") ? "" : "/"}${href}`;
    }

    // Default favicon
    return `${url}/favicon.ico`;
  } catch (err) {
    log(`Logo scrape failed for ${domain}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function analyzeLogoDesign(
  logoUrl: string
): Promise<{ designTrend: string; colors: string[] }> {
  try {
    // Fetch logo image for basic heuristic analysis
    const imgResponse = await fetchWithTimeout(logoUrl);
    if (!imgResponse.ok) return { designTrend: "modern-minimalist", colors: [] };

    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const fileSize = buffer.length;

    // Simple heuristic: infer design trend from file size and URL patterns
    // Smaller logos (< 50KB) tend to be minimalist; larger ones are more complex
    // This is a placeholder — for production, use multimodal vision API
    const trends = ["modern-minimalist", "growth-focused", "established-corporate"];
    const trend = fileSize < 20000 ? trends[0] : fileSize < 100000 ? trends[1] : trends[2];

    // Check for common color patterns in filename or URL
    const colors: string[] = [];
    if (logoUrl.includes("dark")) colors.push("#1a1a1a");
    if (logoUrl.includes("color")) colors.push("#6366F1");

    return { designTrend: trend, colors };
  } catch (err) {
    log(`Logo design analysis error: ${err instanceof Error ? err.message : String(err)}`);
    return { designTrend: "modern-minimalist", colors: [] };
  }
}

export async function detectRebrand(
  domain: string,
  logoUrl: string,
  previousHash?: string
): Promise<boolean> {
  try {
    const imgResponse = await fetchWithTimeout(logoUrl);
    if (!imgResponse.ok) return false;

    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const currentHash = hashImage(buffer);

    if (!previousHash) return false; // No previous hash to compare

    const isRebrand = currentHash !== previousHash;
    if (isRebrand) {
      log(`Rebrand detected for ${domain}: hash changed`);
    }

    return isRebrand;
  } catch (err) {
    log(`Rebrand detection error for ${domain}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

export async function processLogoSignal(
  company: string,
  domain: string
): Promise<LogoData | null> {
  // Scrape logo URL
  const logoUrl = await scrapeLogoUrl(company, domain);
  if (!logoUrl) {
    log(`No logo found for ${domain}`);
    return null;
  }

  // Fetch and hash the logo
  try {
    const imgResponse = await fetchWithTimeout(logoUrl);
    if (!imgResponse.ok) return null;

    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const hash = hashImage(buffer);

    // Get previous hash from Redis for rebrand detection
    const previousLogoData = await getLogoHash(domain);

    // Analyze design
    const { designTrend } = await analyzeLogoDesign(logoUrl);

    // Check for rebrand
    const isRebrand = previousLogoData ? hash !== previousLogoData.hash : false;

    const logoData: LogoData = {
      url: logoUrl,
      hash,
      designTrend,
      isRebrand,
      analyzedAt: Date.now(),
    };

    // Save new logo hash to Redis for future comparisons
    await saveLogoHash(domain, {
      hash,
      url: logoUrl,
      analyzedAt: Date.now(),
    });

    return logoData;
  } catch (err) {
    log(`Logo processing failed for ${domain}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

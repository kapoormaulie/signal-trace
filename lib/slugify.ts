import { randomBytes } from "crypto";

export function makeSlug(name: string, company: string): string {
  const base = `${name}-${company}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

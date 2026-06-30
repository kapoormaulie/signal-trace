import Fuse from "fuse.js";
import type { ProspectRecord } from "@/types";

export function findFuzzyDuplicate(
  name: string,
  company: string,
  history: ProspectRecord[]
): ProspectRecord | null {
  if (history.length === 0) return null;

  const fuse = new Fuse(history, {
    keys: ["name", "company"],
    threshold: 0.35, // tighter = more strict
    includeScore: true,
  });

  const results = fuse.search(`${name} ${company}`);
  return results.length > 0 ? results[0].item : null;
}

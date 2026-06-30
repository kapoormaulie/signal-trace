import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "logs", "run.log");

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function log(message: string): void {
  const line = `[${timestamp()}] ${message}`;
  console.log(line);
  try {
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_PATH, `${line}\n`, "utf8");
  } catch {
    // read-only filesystem (Vercel) — console.log above is sufficient
  }
}

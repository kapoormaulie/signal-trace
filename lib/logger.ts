import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "logs", "run.log");

function ensureLogDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function log(message: string): void {
  ensureLogDir();
  const line = `[${timestamp()}] ${message}\n`;
  fs.appendFileSync(LOG_PATH, line, "utf8");
  if (process.env.NODE_ENV === "development") process.stdout.write(line);
}

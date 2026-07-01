"use client";

import { useEffect, useState } from "react";

export interface UserSettings {
  senderCompany: string;
  senderName: string;
  defaultCtaUrl: string;
  apolloApiKey: string;
  slackWebhookUrl: string;
  crmWebhookUrl: string;
  teamEmail: string;
}

const KEY = "signaltrace_settings";
const EMPTY: UserSettings = {
  senderCompany: "",
  senderName: "",
  defaultCtaUrl: "",
  apolloApiKey: "",
  slackWebhookUrl: "",
  crmWebhookUrl: "",
  teamEmail: "",
};

function readLocal(): UserSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return EMPTY;
}

// Pass a userId once logged in — settings then live on the account (Redis) instead of
// this browser's localStorage, so they follow the user across devices.
export function useSettings(userId?: string | null) {
  const [settings, setSettings] = useState<UserSettings>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    async function load() {
      if (userId) {
        try {
          const res = await fetch("/api/settings");
          const data = await res.json();
          if (cancelled) return;
          if (data.settings) {
            setSettings({ ...EMPTY, ...data.settings });
          } else {
            // First login on this browser with no account settings yet — seed from local.
            const local = readLocal();
            setSettings(local);
            if (local.senderCompany.trim()) {
              fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(local) }).catch(() => {});
            }
          }
        } catch {
          if (!cancelled) setSettings(readLocal());
        }
      } else {
        setSettings(readLocal());
      }
      if (!cancelled) setLoaded(true);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  function save(patch: Partial<UserSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (userId) {
      fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    }
  }

  const isConfigured = loaded && !!settings.senderCompany.trim();

  return { settings, save, loaded, isConfigured };
}

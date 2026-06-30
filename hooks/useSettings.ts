"use client";

import { useEffect, useState } from "react";

export interface UserSettings {
  senderCompany: string;
  senderName: string;
  defaultCtaUrl: string;
  apolloApiKey: string;
  slackWebhookUrl: string;
}

const KEY = "signaltrace_settings";
const EMPTY: UserSettings = {
  senderCompany: "",
  senderName: "",
  defaultCtaUrl: "",
  apolloApiKey: "",
  slackWebhookUrl: "",
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...EMPTY, ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, []);

  function save(patch: Partial<UserSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }

  const isConfigured = loaded && !!settings.senderCompany.trim();

  return { settings, save, loaded, isConfigured };
}

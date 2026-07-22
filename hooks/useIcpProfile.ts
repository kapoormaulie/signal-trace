"use client";

import { useEffect, useState } from "react";
import type { IcpProfile } from "@/types";

const KEY = "signaltrace_icp_profile";
const EMPTY: IcpProfile = {
  description: "",
  filters: { industry: "", size: "", location: "", funding: "", keywords: "", lookalikeDomains: "" },
  updatedAt: "",
};

function readLocal(): IcpProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return EMPTY;
}

// Pass a userId once logged in — the ICP profile then lives on the account (Redis) instead
// of this browser's localStorage, so discovery/targeting stay consistent across sessions.
export function useIcpProfile(userId?: string | null) {
  const [profile, setProfile] = useState<IcpProfile>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    async function load() {
      if (userId) {
        try {
          const res = await fetch("/api/icp");
          const data = await res.json();
          if (cancelled) return;
          if (data.profile) {
            setProfile({ ...EMPTY, ...data.profile });
          } else {
            // First login on this browser with no account profile yet — seed from local.
            const local = readLocal();
            setProfile(local);
            if (local.description.trim()) {
              fetch("/api/icp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(local) }).catch(() => {});
            }
          }
        } catch {
          if (!cancelled) setProfile(readLocal());
        }
      } else {
        setProfile(readLocal());
      }
      if (!cancelled) setLoaded(true);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  function save(patch: Partial<IcpProfile>) {
    const next = { ...profile, ...patch, updatedAt: new Date().toISOString() };
    setProfile(next);
    if (userId) {
      fetch("/api/icp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    }
  }

  return { profile, save, loaded };
}

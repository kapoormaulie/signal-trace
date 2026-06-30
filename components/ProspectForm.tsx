"use client";

import { useState } from "react";
import type { ProspectInput } from "@/types";

interface Props {
  onSubmit: (input: ProspectInput) => void;
  loading: boolean;
}

const inputCls =
  "w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all";
const labelCls = "block text-xs font-medium text-ink-2 mb-1.5";

export default function ProspectForm({ onSubmit, loading }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !company.trim()) return;
    onSubmit({
      name: name.trim(),
      company: company.trim(),
      email: email.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Prospect name <span className="text-brand-600">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelCls}>
            Company <span className="text-brand-600">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="Acme Corp"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Email{" "}
            <span className="text-ink-3 font-normal">(needed for Apollo push)</span>
          </label>
          <input
            type="email"
            className={inputCls}
            placeholder="jane@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelCls}>
            LinkedIn URL{" "}
            <span className="text-ink-3 font-normal">(enables person signals)</span>
          </label>
          <input
            className={inputCls}
            placeholder="https://linkedin.com/in/jane"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim() || !company.trim()}
        className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-signal-sm hover:shadow-signal disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading ? "Fetching signals…" : "Find signals & generate email →"}
      </button>
    </form>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { getUnitScriptSrc, getThemeUrl, getLanguageUrl } from "@/lib/unit";
import { API_BASE_URL } from "@/lib/api";

type TokenResponse = { id: string; token: string; expiration?: string };

export default function ApplicationFormPage() {
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<TokenResponse | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const themeUrl = useMemo(() => getThemeUrl(), []);
  const languageUrl = useMemo(() => getLanguageUrl(), []);

  async function fetchToken() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/integration/unit/application-forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: { env: "sandbox" } }),
      });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          message = j?.message || message;
        } catch {}
        throw new Error(message);
      }
      const j = (await res.json()) as TokenResponse;
      setToken(j);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch token");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchToken();
  }, []);

  useEffect(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    const exp = token?.expiration ? Date.parse(token.expiration) : NaN;
    if (!isNaN(exp)) {
      const now = Date.now();
      const msUntilExpiry = exp - now;
      // Refresh 30s before expiry, minimum 5s delay
      const delay = Math.max(5000, msUntilExpiry - 30_000);
      if (delay > 0) {
        refreshTimer.current = window.setTimeout(() => {
          fetchToken();
        }, delay);
      }
    }
    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [token?.expiration]);

  const showForm = scriptReady && !!token?.id && !!token?.token;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px" }}>
      <h1>Sandbox Onboarding — Application Form</h1>
      <p style={{ color: "#666" }}>
        This page embeds Unit's White-Label Application Form using an application form token in the Sandbox environment.
      </p>

      <Script src={getUnitScriptSrc()} strategy="afterInteractive" onLoad={() => setScriptReady(true)} />

      {loading && <p>Loading token…</p>}
      {error && (
        <div style={{ color: "#b91c1c", background: "#fee2e2", padding: 12, borderRadius: 8, marginTop: 8 }}>
          <strong>Error:</strong> {error}
          <div>
            <button onClick={() => fetchToken()} style={{ marginTop: 8 }}>Retry</button>
          </div>
        </div>
      )}

      {showForm ? (
        <div style={{ marginTop: 16 }}>
          <unit-elements-application-form
            application-form-id={token!.id}
            application-form-token={token!.token}
            {...(themeUrl ? { theme: themeUrl } : {})}
            {...(languageUrl ? { language: languageUrl } : {})}
          />
        </div>
      ) : (
        !loading && !error ? <p>Waiting for script or token…</p> : null
      )}
    </main>
  );
}

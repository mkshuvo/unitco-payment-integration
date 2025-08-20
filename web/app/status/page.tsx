"use client";

import { useEffect, useState, useCallback } from "react";
import { getIntegrationStatus, UnitStatusView } from "../../lib/api";

export default function StatusPage() {
  const [data, setData] = useState<UnitStatusView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await getIntegrationStatus();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Unit Integration Status</h1>
      <button onClick={load} disabled={loading} style={{ marginBottom: 16 }}>
        {loading ? "Checking..." : "Refresh"}
      </button>

      {error && (
        <div style={{ color: "#a00", marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

      {data && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            background: data.status === "UP" ? "#e8f5e9" : "#ffebee",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Status: {data.status}
          </div>
          <div>
            Checked At: <code>{data.checkedAt}</code>
          </div>
          <div>
            Response Time: <code>{data.responseTimeMs} ms</code>
          </div>
          <div>
            Target: <code>{data.target}</code>
          </div>
          {data.reason && (
            <div>
              Reason: <code>{data.reason}</code>
            </div>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <div>No data yet. Try Refresh.</div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

// =====================================================
// CONFIG
// =====================================================

const WS_URL =
  "wss://alphaforge-backend-dtqv.onrender.com/ws/radar";

const API_BASE =
  "https://alphaforge-backend-dtqv.onrender.com";

// =====================================================
// TYPES (INLINE - FIX VERCEL BUILD ISSUE)
// =====================================================

interface Signal {
  id: string;
  title: string;
  source_platform?: string;
  retail_odds?: number;
  institutional_odds?: number;
  deviation_rate: number;
  alpha?: {
    edge_score: number;
    confidence: number;
    exploitability: number;
    alpha_class: string;
  };
}

interface DerivedMarket {
  id: string;
  parent_signal_id: string;
  title: string;
  entry_spread: number;
  market_type: string;
  status: string;
}

// =====================================================
// PAGE
// =====================================================

export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [derived, setDerived] = useState<DerivedMarket[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // WS STREAM
  // =====================================================

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (Array.isArray(payload.data)) {
          setSignals(payload.data);
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    return () => ws.close();
  }, []);

  // =====================================================
  // CREATE DERIVED MARKET (FIXED PAYLOAD)
  // =====================================================

  async function createDerived(signal: Signal) {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/v1/derived/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signal: {
            id: signal.id,
            title: signal.title,
            source_platform: signal.source_platform ?? "unknown",
            retail_odds: signal.retail_odds ?? 0,
            institutional_odds: signal.institutional_odds ?? 0,
            deviation_rate: signal.deviation_rate,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();

      setDerived((prev) => [data.market, ...prev]);
    } catch (err) {
      console.error("createDerived error:", err);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // STATS
  // =====================================================

  const avgDeviation =
    signals.length === 0
      ? 0
      : signals.reduce((a, b) => a + b.deviation_rate, 0) /
        signals.length;

  const critical = signals.filter((s) => s.deviation_rate >= 10);

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-black text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">AlphaForge</h1>
          <p className="text-zinc-400">
            Investor-grade Prediction Market Intelligence
          </p>
        </div>

        <div
          className={`px-3 py-1 rounded text-sm ${
            connected ? "bg-green-500 text-black" : "bg-red-500"
          }`}
        >
          {connected ? "LIVE" : "OFFLINE"}
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-zinc-800 p-4">
          Signals: {signals.length}
        </div>

        <div className="border border-zinc-800 p-4">
          Avg Deviation: {avgDeviation.toFixed(2)}%
        </div>

        <div className="border border-zinc-800 p-4 text-red-400">
          Critical: {critical.length}
        </div>
      </div>

      {/* SIGNAL TABLE */}
      <div className="border border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-900">
            <tr>
              <th className="p-3 text-left">Market</th>
              <th className="p-3 text-left">Deviation</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {signals.map((s) => (
              <tr key={s.id} className="border-t border-zinc-800">
                <td className="p-3">{s.title}</td>

                <td className="p-3 text-yellow-400">
                  {s.deviation_rate.toFixed(2)}%
                </td>

                <td className="p-3">
                  <button
                    disabled={loading}
                    onClick={() => createDerived(s)}
                    className="px-3 py-1 bg-blue-600 rounded"
                  >
                    Create Derived
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DERIVED MARKETS */}
      <div className="mt-10">
        <h2 className="text-xl mb-4">Derived Markets</h2>

        {derived.map((d) => (
          <div
            key={d.id}
            className="border border-zinc-800 p-3 mb-2"
          >
            <div className="font-bold">{d.title}</div>
            <div className="text-sm text-zinc-400">
              {d.market_type} | spread {d.entry_spread}%
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

// =====================================================
// CONFIG
// =====================================================

const WS_URL =
  "wss://alphaforge-backend-dtqv.onrender.com/ws/radar?category=CRYPTO";

// =====================================================
// TYPES
// =====================================================

interface Signal {
  id: string;
  title: string;
  source_platform: string;
  deribit_implied_odds: number;
  manifold_odds: number;
  deviation_rate: number;
  anomaly_type: string;
}

interface Metrics {
  edge: number;
  confidence: number;
  alpha: number;
}

interface WsPayload {
  timestamp: number;
  category: string;
  data: Signal[];
}

// =====================================================
// HELPERS
// =====================================================

function calculateMetrics(signal: Signal): Metrics {
  const spread = Math.abs(
    signal.deribit_implied_odds - signal.manifold_odds
  );

  const edge = Math.min(100, spread * 5);

  const confidence = Math.min(
    100,
    Math.max(20, signal.deviation_rate * 8)
  );

  const alpha = Number(
    (signal.deviation_rate * 0.8).toFixed(2)
  );

  return {
    edge,
    confidence,
    alpha,
  };
}

// =====================================================
// PAGE
// =====================================================

export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [connected, setConnected] = useState(false);

  // =====================================================
  // WS
  // =====================================================

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const payload: WsPayload = JSON.parse(event.data);

        if (Array.isArray(payload.data)) {
          setSignals(payload.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // =====================================================
  // STATS
  // =====================================================

  const criticalSignals = signals.filter(
    (x) => x.deviation_rate >= 10
  );

  const averageDeviation =
    signals.length === 0
      ? 0
      : signals.reduce(
          (acc, cur) => acc + cur.deviation_rate,
          0
        ) / signals.length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* HEADER */}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            AlphaForge
          </h1>

          <p className="text-zinc-400 mt-2">
            Cross-Prediction Market Intelligence Layer
          </p>
        </div>

        <div
          className={`px-4 py-2 rounded text-sm ${
            connected
              ? "bg-green-500 text-black"
              : "bg-red-500 text-white"
          }`}
        >
          {connected ? "LIVE" : "DISCONNECTED"}
        </div>
      </div>

      {/* METRICS */}

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="border border-zinc-800 p-4 rounded">
          <div className="text-zinc-500 text-sm">
            Signals
          </div>

          <div className="text-3xl font-bold mt-2">
            {signals.length}
          </div>
        </div>

        <div className="border border-zinc-800 p-4 rounded">
          <div className="text-zinc-500 text-sm">
            Avg Deviation
          </div>

          <div className="text-3xl font-bold mt-2">
            {averageDeviation.toFixed(2)}%
          </div>
        </div>

        <div className="border border-zinc-800 p-4 rounded">
          <div className="text-zinc-500 text-sm">
            Critical Signals
          </div>

          <div className="text-3xl font-bold mt-2 text-red-400">
            {criticalSignals.length}
          </div>
        </div>
      </div>

      {/* SIGNAL TABLE */}

      <div className="border border-zinc-800 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-900">
            <tr>
              <th className="text-left p-4">
                Market
              </th>

              <th className="text-left p-4">
                Platform
              </th>

              <th className="text-left p-4">
                Retail
              </th>

              <th className="text-left p-4">
                Institutional
              </th>

              <th className="text-left p-4">
                Deviation
              </th>

              <th className="text-left p-4">
                Edge
              </th>

              <th className="text-left p-4">
                Alpha
              </th>
            </tr>
          </thead>

          <tbody>
            {signals.map((signal) => {
              const metrics =
                calculateMetrics(signal);

              return (
                <tr
                  key={signal.id}
                  className="border-t border-zinc-800"
                >
                  <td className="p-4">
                    <div className="max-w-md">
                      {signal.title}
                    </div>
                  </td>

                  <td className="p-4">
                    {signal.source_platform}
                  </td>

                  <td className="p-4">
                    {signal.manifold_odds.toFixed(
                      2
                    )}
                    %
                  </td>

                  <td className="p-4">
                    {signal.deribit_implied_odds.toFixed(
                      2
                    )}
                    %
                  </td>

                  <td className="p-4">
                    <span
                      className={
                        signal.deviation_rate >= 10
                          ? "text-red-400"
                          : signal.deviation_rate >= 5
                          ? "text-yellow-400"
                          : "text-green-400"
                      }
                    >
                      {signal.deviation_rate.toFixed(
                        2
                      )}
                      %
                    </span>
                  </td>

                  <td className="p-4">
                    {metrics.edge.toFixed(0)}
                  </td>

                  <td className="p-4 text-emerald-400">
                    +{metrics.alpha}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
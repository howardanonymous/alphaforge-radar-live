"use client";

import { useEffect, useState } from "react";

// =====================================================
// CONFIG
// =====================================================

const WS_URL =
  "wss://alphaforge-backend-dtqv.onrender.com/ws/radar";
const API_URL = "https://alphaforge-backend-dtqv.onrender.com";

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

interface DerivedMarket {
  id: string;
  parent_signal_id: string;
  title: string;
  description: string;
  market_type: string;
  entry_spread: number;
  status: string;
  created_at: number;
}

interface WsPayload {
  timestamp: number;
  category: string;
  data: Signal[];
}

// =====================================================
// METRICS
// =====================================================

function calculateEdge(s: Signal): number {
  const spread = Math.abs(
    s.deribit_implied_odds - s.manifold_odds
  );
  return Math.min(100, spread * 5);
}

// =====================================================
// PITCH LAYER
// =====================================================

function PitchHeader() {
  return (
    <div className="border border-zinc-800 p-6 rounded mb-6">
      <h1 className="text-2xl font-bold">
        AlphaForge
      </h1>

      <p className="text-zinc-400 mt-2">
        Cross-Market Intelligence → Synthetic Prediction Market Layer
      </p>

      <div className="mt-4 text-sm text-zinc-300 leading-6">
        We detect inefficiencies across prediction markets
        and convert them into{" "}
        <span className="text-white font-semibold">
          tradable derived markets
        </span>.
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Thesis: fragmented prediction markets → structural alpha via cross-market disagreement.
      </div>
    </div>
  );
}

function WhyNow() {
  return (
    <div className="border border-zinc-800 p-6 rounded mb-6">
      <h2 className="text-lg font-semibold mb-3">
        Why now
      </h2>

      <ul className="text-sm text-zinc-300 space-y-2">
        <li>• Prediction markets are fragmented (no unified pricing layer)</li>
        <li>• Institutional vs retail probability divergence is increasing</li>
        <li>• No infrastructure exists to turn mispricing into new markets</li>
        <li>• Market inefficiency is now observable in real-time</li>
      </ul>
    </div>
  );
}

function BusinessModel() {
  return (
    <div className="border border-zinc-800 p-6 rounded mb-6">
      <h2 className="text-lg font-semibold mb-3">
        Business model
      </h2>

      <div className="text-sm text-zinc-300 space-y-2">
        <div>• Derived market creation fees</div>
        <div>• API subscription for quant / hedge funds</div>
        <div>• Institutional analytics layer</div>
        <div>• Future liquidity routing infrastructure</div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [derived, setDerived] = useState<DerivedMarket[]>([]);
  const [connected, setConnected] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
        const payload: WsPayload = JSON.parse(event.data);
        if (Array.isArray(payload.data)) {
          setSignals(payload.data);
        }
      } catch {}
    };

    return () => ws.close();
  }, []);

  // =====================================================
  // CREATE DERIVED MARKET
  // =====================================================

  const createDerived = async (signal: Signal) => {
    setLoadingId(signal.id);

    try {
      const res = await fetch(`${API_URL}/api/v1/derived/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signal }),
      });

      const data = await res.json();

      if (data?.market) {
        setDerived((prev) => [data.market, ...prev]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  // =====================================================
  // FILTER SIGNALS
  // =====================================================

  const actionable = signals.filter(
    (s) => s.deviation_rate >= 4
  );

  const avgDeviation =
    signals.length === 0
      ? 0
      : signals.reduce((a, b) => a + b.deviation_rate, 0) /
        signals.length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-black text-white p-6">

      {/* ===================== PITCH ===================== */}
      <PitchHeader />

      <WhyNow />

      <BusinessModel />

      {/* ===================== LIVE METRICS ===================== */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-zinc-800 p-4 rounded">
          <div className="text-zinc-400 text-xs">
            Live Signals
          </div>
          <div className="text-2xl font-bold">
            {signals.length}
          </div>
        </div>

        <div className="border border-zinc-800 p-4 rounded">
          <div className="text-zinc-400 text-xs">
            Avg Deviation
          </div>
          <div className="text-2xl font-bold">
            {avgDeviation.toFixed(2)}%
          </div>
        </div>

        <div className="border border-zinc-800 p-4 rounded">
          <div className="text-zinc-400 text-xs">
            Derived Markets
          </div>
          <div className="text-2xl font-bold">
            {derived.length}
          </div>
        </div>
      </div>

      {/* ===================== CONNECTION ===================== */}
      <div
        className={`mb-6 px-3 py-2 inline-block rounded text-sm ${
          connected
            ? "bg-green-500 text-black"
            : "bg-red-500 text-white"
        }`}
      >
        {connected ? "LIVE DATA STREAM" : "DISCONNECTED"}
      </div>

      {/* ===================== DERIVED MARKETS ===================== */}
      <div className="border border-zinc-800 p-4 rounded mb-6">
        <h2 className="font-semibold mb-3">
          Derived Markets
        </h2>

        {derived.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            No markets created yet
          </p>
        ) : (
          <div className="space-y-2">
            {derived.map((m) => (
              <div
                key={m.id}
                className="border border-zinc-800 p-3 rounded"
              >
                <div className="text-sm font-medium">
                  {m.title}
                </div>

                <div className="text-xs text-zinc-500">
                  {m.market_type} | Spread{" "}
                  {m.entry_spread.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================== SIGNALS ===================== */}
      <div className="space-y-3">
        {actionable.map((s) => (
          <div
            key={s.id}
            className="border border-zinc-800 p-4 rounded"
          >
            <div className="flex justify-between">
              <div className="font-medium">
                {s.title}
              </div>

              <div className="text-xs text-zinc-500">
                {s.source_platform}
              </div>
            </div>

            <div className="text-xs text-zinc-400 mt-2">
              Retail {s.manifold_odds.toFixed(2)}% | Inst{" "}
              {s.deribit_implied_odds.toFixed(2)}% | Edge{" "}
              <span className="text-white">
                {calculateEdge(s).toFixed(0)}
              </span>
            </div>

            <button
              onClick={() => createDerived(s)}
              disabled={loadingId === s.id}
              className="mt-3 px-3 py-1 text-sm border border-zinc-700 rounded hover:bg-white hover:text-black"
            >
              {loadingId === s.id
                ? "Creating..."
                : "Create Derived Market"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
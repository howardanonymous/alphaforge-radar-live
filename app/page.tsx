"use client";

import { useEffect, useState } from "react";

// =========================================================
// TYPES (v4.1 contract aligned)
// =========================================================
type Signal = {
  id: string;
  title: string;
  source: string;

  retail: number;
  institutional: number;
  deviation: number;

  signal_tier: "INSTITUTIONAL_GRADE" | "PRO_TRADER_GRADE" | "RETAIL_NOISE";
  liquidity_score: number;
  tradable: boolean;

  timestamp: number;
};

type Stream = {
  type: string;
  signals: Signal[];
};

// =========================================================
// CONFIG
// =========================================================
const WS_URL = "ws://localhost:8000/ws/radar";
const API_URL = "http://localhost:8000/api/market/opportunities";

// =========================================================
// PAGE
// =========================================================
export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);

  // =========================================================
  // WS STREAM
  // =========================================================
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (msg) => {
      const data: Stream = JSON.parse(msg.data);
      setSignals(data.signals);
    };

    return () => ws.close();
  }, []);

  // =========================================================
  // LOAD OPPORTUNITIES (market layer)
  // =========================================================
  const loadOpportunities = async () => {
    const res = await fetch(API_URL);
    const json = await res.json();
    setSignals(json.opportunities);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <div className="flex justify-between mb-4">
        <h1 className="font-bold">AlphaForge v4.1 Marketplace</h1>

        <button
          onClick={loadOpportunities}
          className="px-3 py-1 border text-xs"
        >
          OPPORTUNITIES
        </button>
      </div>

      <div className="grid gap-3">
        {signals.map((s) => (
          <div key={s.id} className="border border-zinc-700 p-3 rounded">

            <div className="flex justify-between">
              <div className="font-semibold text-sm">{s.title}</div>
              <div className="text-xs opacity-60">{s.source}</div>
            </div>

            <div className="text-xs mt-2">
              Retail: {s.retail}% | Inst: {s.institutional}%
            </div>

            <div className="text-xs mt-1">
              Deviation: {s.deviation}
            </div>

            <div className="text-xs mt-2">
              Tier: {s.signal_tier}
            </div>

            <div className="text-xs">
              Liquidity: {s.liquidity_score}
            </div>

            <div className="text-xs">
              Tradable: {s.tradable ? "YES" : "NO"}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";

const API = "https://alphaforge-backend-dtqv.onrender.com";

interface Signal {
  id: string;
  title: string;
  deviation_rate: number;
  edge_score?: number;
}

interface Market {
  market_id: string;
}

export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [marketId, setMarketId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/snapshot?category=CRYPTO`)
      .then((r) => r.json())
      .then((d) => setSignals(d.data || []));
  }, []);

  const createMarket = async (signal: Signal) => {
    const res = await fetch(`${API}/api/v1/market/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signal),
    });

    const data: Market = await res.json();
    setMarketId(data.market_id);
  };

  const placeOrder = async (side: "LONG" | "SHORT") => {
    if (!marketId) return;

    await fetch(`${API}/api/v1/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        market_id: marketId,
        side,
        size: 1,
        price: 1,
      }),
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-lg font-bold mb-4">
        AlphaForge Exchange v7 (MVP)
      </h1>

      <div className="grid gap-3">
        {signals.map((s) => (
          <div key={s.id} className="border p-3 border-zinc-800">
            <div className="text-sm">{s.title}</div>
            <div className="text-xs text-zinc-400">
              Spread: {s.deviation_rate}
            </div>

            <button
              onClick={() => createMarket(s)}
              className="mt-2 px-3 py-1 text-xs bg-blue-600 text-black"
            >
              Create Market
            </button>
          </div>
        ))}
      </div>

      {marketId && (
        <div className="mt-6 border-t border-zinc-800 pt-4">
          <div className="text-sm">Market: {marketId}</div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => placeOrder("LONG")}
              className="px-3 py-1 text-xs bg-green-600 text-black"
            >
              LONG
            </button>

            <button
              onClick={() => placeOrder("SHORT")}
              className="px-3 py-1 text-xs bg-red-600 text-black"
            >
              SHORT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
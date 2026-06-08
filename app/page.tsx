"use client";
import React, { useEffect, useState, useCallback } from "react";

// 你的 Render 後端 URL
const WS_URL = "wss://alphaforge-backend-dtqv.onrender.com/ws/radar";
const HTTP_URL = "https://alphaforge-backend-dtqv.onrender.com";

interface Signal {
  id: string; 
  title: string; 
  source_platform: string;
  manifold_odds: number; 
  kalshi_odds: number; 
  deviation_rate: number; 
  signal_score: number; 
  anomaly_type: string;
}

export default function SignalUIV2() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selected, setSelected] = useState<Signal | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.signals) setSignals(data.signals);
    };
    return () => ws.close();
  }, []);

  const executeArbitrage = useCallback(async (s: Signal) => {
    const res = await fetch(`${HTTP_URL}/derived/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal: s })
    });
    if (res.ok) {
      alert(`Arbitrage Vector Executed: ${s.title}`);
    }
  }, []);

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-8 font-mono">
      <header className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">ALPHA_FORGE <span className="text-amber-500">v4.3</span></h1>
          <p className="text-zinc-500 text-xs">Cross-Platform Arbitrage Engine (Kalshi x Manifold)</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 信號列表 */}
        <div className="lg:col-span-2 space-y-4">
          {signals.map((s) => (
            <div 
              key={s.id} 
              onClick={() => setSelected(s)} 
              className={`border p-5 cursor-pointer transition ${
                s.deviation_rate > 5 
                ? "border-amber-500 bg-amber-500/5" 
                : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <div className="flex justify-between text-xs mb-2">
                <span className="text-zinc-500">{s.id}</span>
                <span className={s.deviation_rate > 5 ? "text-amber-400 font-bold" : "text-zinc-500"}>
                  DEV: {s.deviation_rate}%
                </span>
              </div>
              <div className="font-bold text-lg mb-4">{s.title}</div>
              <div className="flex gap-8 text-sm">
                <div>Manifold: <span className="text-white">{s.manifold_odds}%</span></div>
                <div>Kalshi: <span className="text-white">{s.kalshi_odds}%</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* 執行面板 */}
        <div className="border border-zinc-800 p-6 h-fit sticky top-8 bg-zinc-950">
          {selected ? (
            <>
              <h3 className="font-bold mb-2 text-amber-500 uppercase tracking-widest">{selected.anomaly_type}</h3>
              <p className="text-sm mb-6 text-zinc-400">{selected.title}</p>
              <div className="bg-black p-4 border border-zinc-800 mb-6">
                <div className="text-xs text-zinc-500 mb-1">ARBITRAGE SPREAD</div>
                <div className="text-3xl font-bold">{selected.deviation_rate}%</div>
              </div>
              <button 
                onClick={() => executeArbitrage(selected)} 
                className="w-full bg-amber-500 text-black py-3 font-bold text-sm uppercase hover:bg-amber-400 transition"
              >
                Execute Arbitrage
              </button>
            </>
          ) : (
            <div className="text-zinc-600 text-center py-12 border border-dashed border-zinc-800">
              Select an arbitrage signal to analyze.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
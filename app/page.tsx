"use client";

import React, { useEffect, useRef, useState } from "react";

// =========================================================
// ⚙️ CONFIG
// =========================================================
const WS_URL = "wss://alphaforge-backend-dtqv.onrender.com/ws/radar";
const HTTP_URL = "https://alphaforge-backend-dtqv.onrender.com";

// =========================================================
// 📊 TYPES
// =========================================================
interface Signal {
  id: string;
  title: string;
  source_platform: string;

  deribit_implied_odds: number;
  manifold_odds: number;
  deviation_rate: number;

  signal_score: number;
  anomaly_type: string;
}

// =========================================================
// 🧠 SCORE COLOR ENGINE
// =========================================================
const getScoreColor = (score: number) => {
  if (score >= 80) return "text-red-400 border-red-500/40 bg-red-950/20";
  if (score >= 60) return "text-amber-400 border-amber-500/40 bg-amber-950/20";
  return "text-emerald-400 border-emerald-500/20 bg-emerald-950/10";
};

// =========================================================
// 📡 MAIN UI
// =========================================================
export default function SignalUIV2() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [category, setCategory] = useState("CRYPTO");
  const [status, setStatus] = useState("CONNECTING");
  const [selected, setSelected] = useState<Signal | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // =========================================================
  // 🔌 WS CONNECT
  // =========================================================
  useEffect(() => {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`${WS_URL}?category=${category}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("LIVE");

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setSignals(msg.signals || []);
      } catch (e) {
        console.error(e);
      }
    };

    ws.onclose = () => setStatus("DISCONNECTED");

    return () => ws.close();
  }, [category]);

  // =========================================================
  // 📊 RENDER
  // =========================================================
  return (
    <div className="min-h-screen bg-black text-zinc-200 p-6">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">

        <div>
          <h1 className="text-xl font-bold tracking-tight">
            SIGNAL INTELLIGENCE <span className="text-amber-400">v2</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Cross-Venue Pricing Inefficiency Detection Layer
          </p>
        </div>

        <div className="text-xs font-mono">
          STATUS:{" "}
          <span className={status === "LIVE" ? "text-green-400" : "text-red-400"}>
            {status}
          </span>
        </div>
      </div>

      {/* =====================================================
          CATEGORY SWITCH
      ===================================================== */}
      <div className="flex gap-2 mb-6">
        {["CRYPTO", "STOCKS", "WEATHER", "POLITICS"].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 text-xs border rounded ${
              category === c
                ? "bg-amber-500 text-black border-amber-400"
                : "border-zinc-700 text-zinc-400"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* =====================================================
          MAIN GRID
      ===================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ===================================================
            SIGNAL LIST
        =================================================== */}
        <div className="lg:col-span-2 space-y-3">

          {signals.length === 0 && (
            <div className="text-xs text-zinc-500 border border-zinc-800 p-6 rounded">
              Waiting for signal stream...
            </div>
          )}

          {signals.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className="cursor-pointer border border-zinc-800 rounded p-4 hover:border-amber-500/50 transition"
            >

              {/* TOP */}
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {s.id}
                </span>

                <span className={`text-[10px] px-2 py-0.5 border rounded font-mono ${getScoreColor(s.signal_score)}`}>
                  SCORE {s.signal_score}
                </span>
              </div>

              {/* TITLE */}
              <div className="text-sm font-semibold mb-3">
                {s.title}
              </div>

              {/* METRICS */}
              <div className="grid grid-cols-3 text-xs text-zinc-400 font-mono">
                <div>
                  Retail<br />
                  <span className="text-zinc-200">{s.manifold_odds}%</span>
                </div>

                <div>
                  Institutional<br />
                  <span className="text-zinc-200">{s.deribit_implied_odds}%</span>
                </div>

                <div>
                  Spread<br />
                  <span className="text-amber-400">{s.deviation_rate}%</span>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-zinc-500">
                {s.anomaly_type}
              </div>
            </div>
          ))}
        </div>

        {/* ===================================================
            DETAIL PANEL
        =================================================== */}
        <div className="border border-zinc-800 rounded p-4 h-fit sticky top-4">

          {!selected ? (
            <div className="text-xs text-zinc-500">
              Select a signal to analyze execution strategy.
            </div>
          ) : (
            <>
              <div className="text-[10px] text-zinc-500 font-mono mb-2">
                {selected.id}
              </div>

              <div className="text-sm font-bold mb-4">
                {selected.title}
              </div>

              <div className={`p-3 border rounded mb-4 ${getScoreColor(selected.signal_score)}`}>
                SIGNAL SCORE: {selected.signal_score}
              </div>

              <div className="text-xs font-mono space-y-2">

                <div>
                  Retail: {selected.manifold_odds}%
                </div>

                <div>
                  Institutional: {selected.deribit_implied_odds}%
                </div>

                <div>
                  Spread: {selected.deviation_rate}%
                </div>

              </div>

              <button className="mt-4 w-full bg-amber-500 text-black text-xs font-bold py-2 rounded">
                EXECUTION VECTOR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import type { Signal, Metrics } from "../shared/schemas";

const WS_URL = "wss://alphaforge-backend-dtqv.onrender.com/ws/radar";

export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setSignals(msg.data);
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    fetch("https://alphaforge-backend-dtqv.onrender.com/api/metrics")
      .then((r) => r.json())
      .then((data: Metrics) => setMetrics(data));
  }, [signals]);

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-xl font-bold mb-4">
        AlphaForge Intelligence Layer v4.5
      </h1>

      {metrics && (
        <div className="text-xs text-gray-400 mb-4">
          Avg Spread: {metrics.avg_spread.toFixed(2)}% ·
          Avg Confidence: {metrics.avg_confidence.toFixed(2)} ·
          Signals: {metrics.total_signals}
        </div>
      )}

      <div className="space-y-4">
        {signals.map((s) => (
          <div key={s.id} className="border border-gray-800 p-4">

            <div className="flex justify-between">
              <div className="text-sm font-semibold">{s.title}</div>
              <div className="text-xs text-gray-400">
                {s.anomaly_type}
              </div>
            </div>

            <div className="text-xs mt-2 grid grid-cols-3 gap-2 text-gray-300">
              <div>Retail: {s.retail_odds.toFixed(1)}%</div>
              <div>Inst: {s.institutional_odds.toFixed(1)}%</div>
              <div>Spread: {s.deviation_rate.toFixed(2)}%</div>
            </div>

            <div className="text-xs mt-2 text-green-400">
              Confidence: {s.confidence.toFixed(2)}
            </div>

            <div className="text-xs mt-2 text-gray-400">
              {s.explanation}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
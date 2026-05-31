'use client';

import { useEffect, useState, useRef } from 'react';

interface DeviationData {
  id: string;
  title: string;
  deviation_rate: number;
  polymarket_odds: number;
  manifold_odds: number;
  anomaly_type: string;
  slug: string;
}

export default function CryptoRadarDashboard() {

  const BACKEND_API =
    process.env.NEXT_PUBLIC_BACKEND_API ||
    'http://127.0.0.1:8000/api/v1';

  const WS_URL =
    process.env.NEXT_PUBLIC_WS_URL ||
    'ws://127.0.0.1:8000/ws/public/btc-drift';

  // ======================
  // Market State
  // ======================
  const [btcData, setBtcData] = useState({
    price: 0,
    drift_index: 0,
    status: 'DISCONNECTED'
  });

  const [deviations, setDeviations] = useState<DeviationData[]>([]);
  const [userStrategyBias, setUserStrategyBias] = useState<string | null>(null);
  const [isAligning, setIsAligning] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // ======================
  // Mount safety
  // ======================
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ======================
  // WebSocket Feed
  // ======================
  useEffect(() => {
    let isAlive = true;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isAlive) {
          setBtcData(prev => ({ ...prev, status: 'STABLE' }));
        }
      };

      ws.onmessage = (event) => {
        if (!isAlive) return;

        try {
          const raw = JSON.parse(event.data);

          if (raw.btc_drift) {
            setBtcData(raw.btc_drift);
          }

          if (raw.prediction_market_deviations) {
            setDeviations(raw.prediction_market_deviations);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        if (isAlive) {
          setBtcData(prev => ({ ...prev, status: 'DISCONNECTED' }));
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      isAlive = false;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [WS_URL]);

  // ======================
  // Strategy (FREE VERSION)
  // ======================
  const handleStrategyAlign = async (
    e: React.MouseEvent,
    item: DeviationData
  ) => {
    e.preventDefault();
    if (isAligning) return;

    setIsAligning(true);
    setUserStrategyBias(null);

    try {
      const res = await fetch(`${BACKEND_API}/strategy-focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: item.id })
      });

      const result = await res.json();

      if (result.status === 'SUCCESS') {
        setUserStrategyBias(result.advice);
      } else {
        setUserStrategyBias('Signal unavailable');
      }
    } catch {
      setUserStrategyBias('Backend offline');
    } finally {
      setIsAligning(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'STABLE')
      return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';

    return 'text-red-500 border-red-800 bg-red-950/40 animate-pulse';
  };

  if (!isMounted) return null;

  return (
    <div className="p-6 bg-black text-white min-h-screen font-mono">

      {/* Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold">
          AlphaForge <span className="text-amber-500">Radar</span>
        </h1>

        <p className="text-xs text-zinc-500">
          Options vs Prediction Market Mispricing Engine
        </p>
      </div>

      {/* Status */}
      <div className="flex gap-3 mb-6 text-xs">
        <div className={`px-3 py-1 border rounded ${getStatusColor(btcData.status)}`}>
          {btcData.status}
        </div>
        <div className="px-3 py-1 border border-zinc-800 rounded">
          Drift: {btcData.drift_index}
        </div>
        <div className="px-3 py-1 border border-zinc-800 rounded">
          Price: {btcData.price}
        </div>
      </div>

      {/* Strategy Panel */}
      {userStrategyBias && (
        <div className="mb-6 p-3 border border-amber-500/30 bg-zinc-900 text-sm">
          {userStrategyBias}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Radar List */}
        <div className="space-y-3">
          {deviations.length === 0 && (
            <div className="text-zinc-600 text-sm">
              Loading market signals...
            </div>
          )}

          {deviations.map(item => (
            <div
              key={item.id}
              className="p-4 border border-zinc-800 rounded bg-zinc-900/30"
            >
              <div className="text-xs text-zinc-500">
                {item.id}
              </div>

              <div className="font-bold mt-1">
                {item.title}
              </div>

              <div className="text-xs mt-2 flex gap-4">
                <span>Deribit: {item.polymarket_odds}%</span>
                <span>Manifold: {item.manifold_odds}%</span>
                <span className="text-amber-400">
                  Δ {item.deviation_rate}%
                </span>
              </div>

              <button
                onClick={(e) => handleStrategyAlign(e, item)}
                disabled={isAligning}
                className="mt-3 px-3 py-1 text-xs bg-amber-500 text-black rounded"
              >
                Analyze
              </button>

              {/* 👉 Future Affiliate Hook */}
              <div className="mt-2 text-xs text-zinc-500">
                Trade links: (binance / deribit / hyperliquid)
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel (simple) */}
        <div className="border border-zinc-800 p-4 rounded">
          <div className="text-xs text-zinc-500 mb-2">
            Market Intelligence Layer
          </div>

          <div className="text-sm text-zinc-300">
            This dashboard compares institutional options pricing
            vs retail prediction markets to detect mispricing signals.
          </div>

          <div className="mt-4 text-xs text-zinc-600">
            Next step: add affiliate trading links + signal history.
          </div>
        </div>

      </div>
    </div>
  );
}

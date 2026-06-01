'use client';

import { useEffect, useState } from 'react';

interface DeviationData {
  id: string;
  title: string;
  polymarket_odds: number;
  manifold_odds: number;
  deviation_rate: number;
  anomaly_type: string;
  slug: string;
}

interface BTCState {
  price: number;
  drift_index: number;
  status: string;
}

export default function Page() {
  const WS_URL =
    process.env.NEXT_PUBLIC_WS_URL ||
    'wss://alphaforge-backend-dtqv.onrender.com/ws/public/btc-drift';

  const BACKEND_API =
    process.env.NEXT_PUBLIC_BACKEND ||
    'https://alphaforge-backend-dtqv.onrender.com';

  const [btc, setBtc] = useState<BTCState>({
    price: 0,
    drift_index: 0,
    status: 'INIT',
  });

  const [signals, setSignals] = useState<DeviationData[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [status, setStatus] = useState<'LIVE' | 'OFFLINE' | 'RECONNECTING'>(
    'RECONNECTING'
  );
  const [loading, setLoading] = useState(false);

  // =========================
  // WebSocket Stream
  // =========================
  useEffect(() => {
    let ws: WebSocket;
    let retryTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setStatus('LIVE');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.btc_drift) {
            setBtc(data.btc_drift);
          }

          if (data.prediction_market_deviations) {
            setSignals(data.prediction_market_deviations);
          }
        } catch (e) {
          console.error('WS parse error', e);
        }
      };

      ws.onclose = () => {
        setStatus('RECONNECTING');
        retryTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setStatus('OFFLINE');
        ws.close();
      };
    };

    connect();

    return () => {
      ws?.close();
      clearTimeout(retryTimer);
    };
  }, [WS_URL]);

  // =========================
  // Strategy / Signal Action
  // =========================
  const handleAnalyze = async (signal: DeviationData) => {
    if (loading) return;

    setLoading(true);
    setSelectedSignal(signal.id);

    try {
      const res = await fetch(`${BACKEND_API}/strategy-focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: signal.id }),
      });

      const data = await res.json();
      setAnalysis(data.advice || 'No signal returned');
    } catch {
      setAnalysis('Backend offline');
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UI Color Logic
  // =========================
  const getDeviationColor = (v: number) => {
    if (v > 5) return 'text-red-500';
    if (v > 2) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono">

      {/* HEADER */}
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold">
          AlphaForge <span className="text-amber-500">Signal Engine</span>
        </h1>
        <p className="text-xs text-zinc-500">
          Options vs Prediction Market Mispricing Layer
        </p>
      </div>

      {/* STATUS BAR */}
      <div className="flex gap-3 mb-6 text-xs">
        <div
          className={`px-3 py-1 border rounded ${
            status === 'LIVE'
              ? 'text-emerald-400 border-emerald-800'
              : status === 'RECONNECTING'
              ? 'text-yellow-400 border-yellow-800'
              : 'text-red-500 border-red-800'
          }`}
        >
          {status}
        </div>

        <div className="px-3 py-1 border border-zinc-800 rounded">
          BTC: {btc.price}
        </div>

        <div className="px-3 py-1 border border-zinc-800 rounded">
          Drift: {btc.drift_index}
        </div>
      </div>

      {/* ANALYSIS PANEL */}
      {analysis && (
        <div className="mb-6 p-3 border border-amber-500/30 bg-zinc-900 text-sm">
          {analysis}
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {signals.length === 0 && (
          <div className="text-zinc-600">Waiting for market signals...</div>
        )}

        {signals.map((s) => (
          <div
            key={s.id}
            className="p-4 border border-zinc-800 rounded bg-zinc-900/30"
          >
            {/* TITLE */}
            <div className="font-bold text-white">{s.title}</div>

            {/* METRICS */}
            <div className="mt-3 text-xs text-zinc-400 space-y-1">
              <div>Options Implied: {s.polymarket_odds}%</div>
              <div>Market Implied: {s.manifold_odds}%</div>
            </div>

            {/* DEVIATION */}
            <div
              className={`mt-2 text-sm ${getDeviationColor(
                s.deviation_rate
              )}`}
            >
              Deviation: {s.deviation_rate}%
            </div>

            {/* ANOMALY */}
            <div className="text-xs mt-1 text-zinc-500">
              {s.anomaly_type}
            </div>

            {/* ACTION */}
            <button
              onClick={() => handleAnalyze(s)}
              disabled={loading}
              className="mt-3 px-3 py-1 text-xs bg-amber-500 text-black rounded hover:bg-amber-400 transition"
            >
              {loading && selectedSignal === s.id
                ? 'Analyzing...'
                : 'Generate Trade Signal'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
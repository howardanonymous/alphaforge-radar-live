'use client';

import { useEffect, useState } from 'react';

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
  // 生產環境建議配置環境變數，若無則預設為演示/錯誤狀態
  const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || ''; 
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || ''; 

  const [btcData, setBtcData] = useState({
    price: 0,
    drift_index: 0,
    status: 'INITIALIZING'
  });

  const [deviations, setDeviations] = useState<DeviationData[]>([]);
  const [userStrategyBias, setUserStrategyBias] = useState<string | null>(null);
  const [isAligning, setIsAligning] = useState(false);

  useEffect(() => {
    // 檢查是否有設定 WS_URL，若無則進入離線演示模式
    if (!WS_URL) {
      setBtcData(prev => ({ ...prev, status: 'DEMO MODE (No Backend)' }));
      return;
    }

    let isAlive = true;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (isAlive) setBtcData(prev => ({ ...prev, status: 'STABLE' }));
      };

      ws.onmessage = (event) => {
        if (!isAlive) return;
        try {
          const raw = JSON.parse(event.data);
          if (raw.btc_drift) setBtcData(raw.btc_drift);
          if (raw.prediction_market_deviations) setDeviations(raw.prediction_market_deviations);
        } catch (e) { console.error("WS Parse Error", e); }
      };

      ws.onclose = () => {
        if (isAlive) {
          setBtcData(prev => ({ ...prev, status: 'RECONNECTING...' }));
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        setBtcData(prev => ({ ...prev, status: 'OFFLINE' }));
        ws.close();
      };
    }

    connect();
    return () => { isAlive = false; clearTimeout(reconnectTimer); };
  }, [WS_URL]);

  const handleStrategyAlign = async (e: React.MouseEvent, item: DeviationData) => {
    e.preventDefault();
    if (!BACKEND_API || isAligning) return;

    setIsAligning(true);
    try {
      const res = await fetch(`${BACKEND_API}/strategy-focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: item.id })
      });
      const result = await res.json();
      setUserStrategyBias(result.status === 'SUCCESS' ? result.advice : 'Signal unavailable');
    } catch {
      setUserStrategyBias('Backend offline');
    } finally {
      setIsAligning(false);
    }
  };

  return (
    <div className="p-6 bg-black text-white min-h-screen font-mono">
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold">AlphaForge <span className="text-amber-500">Radar</span></h1>
        <p className="text-xs text-zinc-500">Options vs Prediction Market Mispricing Engine</p>
      </div>

      <div className="flex gap-3 mb-6 text-xs">
        <div className={`px-3 py-1 border rounded ${btcData.status === 'STABLE' ? 'text-emerald-400 border-emerald-800' : 'text-red-500 border-red-800'}`}>
          {btcData.status}
        </div>
        <div className="px-3 py-1 border border-zinc-800 rounded">Drift: {btcData.drift_index}</div>
        <div className="px-3 py-1 border border-zinc-800 rounded">Price: {btcData.price}</div>
      </div>

      {userStrategyBias && (
        <div className="mb-6 p-3 border border-amber-500/30 bg-zinc-900 text-sm">
          {userStrategyBias}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {deviations.length === 0 && <div className="text-zinc-600">Waiting for data...</div>}
          {deviations.map(item => (
            <div key={item.id} className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
              <div className="font-bold">{item.title}</div>
              <button onClick={(e) => handleStrategyAlign(e, item)} disabled={isAligning} className="mt-3 px-3 py-1 text-xs bg-amber-500 text-black rounded">
                Analyze
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
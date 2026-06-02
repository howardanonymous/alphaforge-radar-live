'use client';

import { useEffect, useState, useCallback } from 'react';

interface DeviationSignal {
  id: string;
  title: string;
  deribit_implied_odds: number; // 機構/期權/氣象局 隱含勝率
  manifold_odds: number;        // 預測市場共識勝率
  deviation_rate: number;
  anomaly_type: string;
}

type Category = 'CRYPTO' | 'STOCKS' | 'WEATHER' | 'POLITICS';

export default function Page() {
  const API_BASE = 'https://alphaforge-backend-dtqv.onrender.com/api/v1';

  // 狀態管理
  const [currentCategory, setCurrentCategory] = useState<Category>('CRYPTO');
  const [signals, setSignals] = useState<DeviationSignal[]>([]);
  const [status, setStatus] = useState<'SYNCED' | 'STALE' | 'FETCHING'>('FETCHING');
  const [lastUpdated, setLastUpdated] = useState<string>('Never');
  
  // 商業化狀態
  const [apiKey] = useState<string>('alpha_demo_user_xyz');
  const [isPaid, setIsPaid] = useState<boolean>(true);

  // 抓取指定分類的快照數據
  const fetchSnapshot = useCallback(async (cat: Category) => {
    setStatus('FETCHING');
    try {
      const response = await fetch(`${API_BASE}/snapshot?category=${cat}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      });

      if (response.status === 402) {
        setIsPaid(false);
        setStatus('STALE');
        return;
      }

      if (!response.ok) throw new Error('Network response error');
      
      const resData = await response.json();
      setSignals(resData.data || []);
      setStatus('SYNCED');
      setLastUpdated(new Date(resData.timestamp * 1000).toLocaleTimeString());
      setIsPaid(true);
    } catch (e) {
      console.error('❌ Fetch Error:', e);
      setStatus('STALE');
    }
  }, [apiKey]);

  // 當切換分類或定時器觸發時更新
  useEffect(() => {
    fetchSnapshot(currentCategory);
    const interval = setInterval(() => fetchSnapshot(currentCategory), 15000);
    return () => clearInterval(interval);
  }, [currentCategory, fetchSnapshot]);

  return (
    <div className="min-h-screen bg-[#070708] text-[#e4e4e7] p-6 font-mono antialiased">
      {/* 頂部極簡儀表盤面板 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-[#1c1c1f] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center border px-3 py-1 rounded text-xs font-black tracking-widest ${
            status === 'SYNCED' ? 'bg-[#071207] border-[#123a12] text-[#10b981]' :
            status === 'FETCHING' ? 'bg-[#121107] border-[#3a3512] text-[#f59e0b]' :
            'bg-[#120707] border-[#3a1212] text-[#ef4444]'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full mr-2 ${
              status === 'SYNCED' ? 'bg-[#10b981] animate-pulse' :
              status === 'FETCHING' ? 'bg-[#f59e0b] animate-spin' : 'bg-[#ef4444]'
            }`}></span>
            RADAR: {status}
          </div>

          <div className="bg-[#0f0f11] border border-[#27272a] px-3 py-1 rounded text-xs">
            <span className="text-[#a1a1aa] mr-1">Sync Time:</span> 
            <span className="text-white font-bold">{lastUpdated}</span>
          </div>
        </div>

        {/* 商業付費牆入口 */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#a1a1aa]">
            Access: <span className={isPaid ? "text-[#10b981] font-bold" : "text-[#ef4444] font-bold"}>{isPaid ? "Active (24H)" : "Expired"}</span>
          </div>
          <button className="bg-[#22c55e] hover:bg-[#16a34a] text-black text-xs font-black px-3 py-1 rounded transition-colors">
            Rent 24H ($10 USDC)
          </button>
        </div>
      </div>

      {/* 核心架構：四大分頁分流 Tabs 切換器 */}
      <div className="flex flex-wrap gap-2 mb-8 bg-[#0c0c0e] p-1.5 border border-[#1c1c1f] rounded-lg max-w-3xl">
        {(['CRYPTO', 'STOCKS', 'WEATHER', 'POLITICS'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCurrentCategory(cat)}
            className={`flex-1 min-w-[100px] text-center py-2 text-xs font-black tracking-wider transition-all duration-150 rounded ${
              currentCategory === cat
                ? 'bg-[#f59e0b] text-black'
                : 'text-[#71717a] hover:text-white hover:bg-[#141417]'
            }`}
          >
            {cat === 'CRYPTO' && '🪙 CRYPTO'}
            {cat === 'STOCKS' && '📈 STOCKS'}
            {cat === 'WEATHER' && '🌡️ WEATHER'}
            {cat === 'POLITICS' && '🌍 POLITICS'}
          </button>
        ))}
      </div>

      {/* 標題區域 */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight">AlphaForge Signal Engine</h1>
        <p className="text-xs text-[#71717a] mt-1">
          Cross-Market Cognitive Dissonance Radar & Arbitrage Layer
        </p>
      </div>

      {/* 訊號卡片牆 */}
      <div className="grid grid-cols-1 gap-4 max-w-3xl">
        {!isPaid ? (
          <div className="text-center py-16 border border-dashed border-[#ef4444]/30 rounded bg-[#120707] text-[#ef4444] text-xs">
            🔒 MATRIX LOCKED. Activate your 24-hour pass via USDC to view {currentCategory} signals.
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#222] rounded bg-[#09090b] text-[#52525b] text-xs">
            Scanning institutional options, global data models & prediction markets for {currentCategory}...
          </div>
        ) : (
          signals.map((s) => (
            <div 
              key={s.id} 
              className="p-5 rounded-lg border border-[#1c1c1f] bg-[#0c0c0e] hover:border-[#3f3f46] transition-all duration-150"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] text-[#52525b] font-bold tracking-wider">
                  {s.id}
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded font-black ${
                  s.anomaly_type.includes('CRITICAL') ? 'bg-[#3a1212] text-[#ef4444]' :
                  s.anomaly_type.includes('MISPRICING') ? 'bg-[#3a2a12] text-[#f59e0b]' : 'bg-[#123a12] text-[#10b981]'
                }`}>
                  {s.anomaly_type}
                </div>
              </div>

              <div className="text-md font-extrabold text-white mb-3 tracking-tight">
                {s.title}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold mb-4">
                <div className="text-[#a1a1aa]">
                  {currentCategory === 'WEATHER' ? 'NOAA/Weather Models:' : 'Institutional Implied:'}{' '}
                  <span className="text-white ml-1">{s.deribit_implied_odds}%</span>
                </div>
                <div className="text-[#a1a1aa]">
                  Prediction Consensus: <span className="text-white ml-1">{s.manifold_odds}%</span>
                </div>
                <div className="flex items-center font-black text-[#f59e0b]">
                  <span className="mr-1">Δ Spread:</span> {s.deviation_rate}%
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <button className="bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-black px-4 py-1.5 rounded transition-colors">
                  Analyze Disruption
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
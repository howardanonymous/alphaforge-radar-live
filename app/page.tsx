'use client';

import { useEffect, useState, useCallback } from 'react';

// 精確對齊 Python 後端回傳的資料結構
interface DeviationSignal {
  id: string;
  title: string;
  deribit_implied_odds: number;
  manifold_odds: number;
  deviation_rate: number;
  anomaly_type: string;
}

export default function Page() {
  // 替換為全新快照 RESTful API 端點
  const API_BASE = 'https://alphaforge-backend-dtqv.onrender.com/api/v1';

  const [signals, setSignals] = useState<DeviationSignal[]>([]);
  const [status, setStatus] = useState<'SYNCED' | 'STALE' | 'FETCHING'>('FETCHING');
  const [lastUpdated, setLastUpdated] = useState<string>('Never');
  
  // 商業化狀態預留：模擬用戶的金流與金鑰狀態
  const [apiKey, setApiKey] = useState<string>('alpha_demo_user_xyz');
  const [isPaid, setIsPaid] = useState<boolean>(true); // 預留付費牆控制開關

  // 封裝快照拉取邏輯
  const fetchSnapshot = useCallback(async () => {
    setStatus('FETCHING');
    try {
      const response = await fetch(`${API_BASE}/snapshot`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey // 帶入 API 金鑰供後端驗證 24H 效期
        }
      });

      if (response.status === 402) {
        setIsPaid(false);
        setStatus('STALE');
        return;
      }

      if (!response.ok) throw new Error('Network response was not ok');
      
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

  // 設定 15 秒定時器，完美對齊後端 Snapshot 刷新步調
  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 15000);
    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  // 模擬觸發 24H 租用開通（整合後端 /activate-rent）
  const handleRentActivation = async () => {
    try {
      const response = await fetch(`${API_BASE}/activate-rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          tx_id: "0x_mock_usdc_tx_hash" // 預留鏈上交易雜湊
        })
      });
      if (response.ok) {
        alert("⚡ $10 USDC Payment Verified! 24H Access Granted.");
        fetchSnapshot();
      }
    } catch (e) {
      alert("Verification failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-[#e4e4e7] p-6 font-mono antialiased">
      {/* 頂部極簡儀表盤面板 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-[#1c1c1f] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 快照狀態燈 */}
          <div className={`flex items-center border px-3 py-1 rounded text-xs font-black tracking-widest ${
            status === 'SYNCED' ? 'bg-[#071207] border-[#123a12] text-[#10b981]' :
            status === 'FETCHING' ? 'bg-[#121107] border-[#3a3512] text-[#f59e0b]' :
            'bg-[#120707] border-[#3a1212] text-[#ef4444]'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full mr-2 ${
              status === 'SYNCED' ? 'bg-[#10b981] animate-pulse' :
              status === 'FETCHING' ? 'bg-[#f59e0b] animate-spin' : 'bg-[#ef4444]'
            }`}></span>
            SNAPSHOT: {status} (15s Grid)
          </div>

          {/* 上次同步時間 */}
          <div className="bg-[#0f0f11] border border-[#27272a] px-3 py-1 rounded text-xs">
            <span className="text-[#a1a1aa] mr-1">Last Sync:</span> 
            <span className="text-white font-bold">{lastUpdated}</span>
          </div>
        </div>

        {/* 商業付費牆入口：直接在介面最顯眼處錨定定價 */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#a1a1aa]">
            Access: <span className={isPaid ? "text-[#10b981] font-bold" : "text-[#ef4444] font-bold"}>{isPaid ? "Active (24H)" : "Expired"}</span>
          </div>
          <button 
            onClick={handleRentActivation}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-black text-xs font-black px-3 py-1 rounded transition-colors duration-100"
          >
            Rent 24H ($10 USDC)
          </button>
        </div>
      </div>

      {/* 標題區域 */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight">AlphaForge Signal Engine</h1>
        <p className="text-xs text-[#71717a] mt-1">Cross-Market Structural Mispricing Layer (Excluding Elections)</p>
      </div>

      {/* 訊號卡片巨觀牆 */}
      <div className="grid grid-cols-1 gap-4 max-w-3xl">
        {!isPaid ? (
          <div className="text-center py-16 border border-dashed border-[#ef4444]/30 rounded bg-[#120707] text-[#ef4444] text-xs">
            🔒 PREMIUM ARBITRAGE MATRIX LOCKED. Please activate your 24-hour pass via USDC.
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#222] rounded bg-[#09090b] text-[#52525b] text-xs">
            Compiling institutional options delta & matching prediction markets...
          </div>
        ) : (
          signals.map((s) => {
            // 從 ID 動態推導標的貨幣以生成交易連結
            const currency = s.id.includes('ETH') ? 'ETH' : 'BTC';
            
            return (
              <div 
                key={s.id} 
                className="p-5 rounded-lg border border-[#1c1c1f] bg-[#0c0c0e] hover:border-[#3f3f46] transition-all duration-150"
              >
                {/* 頂部套利代碼與異常狀態高亮 */}
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-[#52525b] font-bold tracking-wider">
                    {s.id}
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded font-black ${
                    s.anomaly_type.includes('HIGH') ? 'bg-[#3a1212] text-[#ef4444]' :
                    s.anomaly_type.includes('MEDIUM') ? 'bg-[#3a2a12] text-[#f59e0b]' : 'bg-[#123a12] text-[#10b981]'
                  }`}>
                    {s.anomaly_type}
                  </div>
                </div>

                {/* 標題：目標行權描述 */}
                <div className="text-md font-extrabold text-white mb-3 tracking-tight">
                  {s.title}
                </div>

                {/* 機率對照面板 */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold mb-4">
                  <div className="text-[#a1a1aa]">
                    Deribit Implied Win Rate: <span className="text-white ml-1">{s.deribit_implied_odds}%</span>
                  </div>
                  <div className="text-[#a1a1aa]">
                    Manifold Consensus: <span className="text-white ml-1">{s.manifold_odds}%</span>
                  </div>
                  {/* Δ 偏差值動態著色 */}
                  <div className={`flex items-center font-black ${s.deviation_rate > 5.0 ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
                    <span className="mr-1">Δ Spread:</span> {s.deviation_rate}%
                  </div>
                </div>

                {/* 操作與下單控制鏈接組 */}
                <div className="flex items-center gap-4 pt-1">
                  <button className="bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-black px-4 py-1.5 rounded transition-colors duration-100">
                    Analyze Execution
                  </button>
                  
                  <div className="text-[11px] text-[#52525b]">
                    Trade Routing: (
                    <a href={`https://www.binance.com/zh-TC/trade/${currency}_USDT`} target="_blank" rel="noreferrer" className="text-[#a1a1aa] hover:text-white transition-colors underline mx-1">binance</a> /
                    <a href="https://www.deribit.com/" target="_blank" rel="noreferrer" className="text-[#a1a1aa] hover:text-white transition-colors underline mx-1">deribit</a> /
                    <a href="https://app.hyperliquid.xyz/" target="_blank" rel="noreferrer" className="text-[#a1a1aa] hover:text-white transition-colors underline mx-1">hyperliquid</a>
                    )
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
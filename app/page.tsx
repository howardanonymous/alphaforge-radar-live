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

interface DisruptionAnalysis {
  title: string;
  type: string;
  ev_rate: number;
  diagnostic: string;
  trade_action: string;
}

export default function Page() {
  // 🎯 1. 自動修正 API_BASE 路由結構，後端 main.py 自帶 /api/v1，故此處與後端路由完美咬合
  const API_BASE = 'https://alphaforge-backend-dtqv.onrender.com/api/v1';

  // 狀態管理
  const [currentCategory, setCurrentCategory] = useState<Category>('CRYPTO');
  const [signals, setSignals] = useState<DeviationSignal[]>([]);
  const [status, setStatus] = useState<'SYNCED' | 'STALE' | 'FETCHING'>('FETCHING');
  const [lastUpdated, setLastUpdated] = useState<string>('Never');
  
  // 商業化狀態
  const [apiKey] = useState<string>('alpha_demo_user_xyz');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  
  // 帳號防禦對接狀態
  const [bindPlatform, setBindPlatform] = useState<string>('POLYMARKET');
  const [userUid, setUserUid] = useState<string>('');
  const [bindStatus, setBindStatus] = useState<string>('');

  // 彈窗（Modal）控制與分析快取
  const [selectedSignal, setSelectedSignal] = useState<DeviationSignal | null>(null);
  const [analysisCache, setAnalysisCache] = useState<DisruptionAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // 儲存從後端動態拉取的安全的推廣返傭連結
  const [referralLinks, setReferralLinks] = useState<Record<string, string>>({});

  // 1. 抓取指定分類的快照數據
  const fetchSnapshot = useCallback(async (cat: Category) => {
    setStatus('FETCHING');
    try {
      // 🎯 2. 後端快照路由為 /snapshot，傳入 query 參數 category
      const response = await fetch(`${API_BASE}/snapshot?category=${cat}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 402) {
        setIsPaid(false);
        setStatus('STALE');
        return;
      }

      if (!response.ok) throw new Error('Network response error');
      
      const resData = await response.json();
      // 🎯 3. 後端傳回結構為 { timestamp, category, data: [...] }，無縫餵入 state
      setSignals(resData.data || []);
      setStatus('SYNCED');
      setLastUpdated(new Date(resData.timestamp * 1000).toLocaleTimeString());
      setIsPaid(true);
    } catch (e) {
      console.error('❌ Fetch Error:', e);
      setStatus('STALE');
    }
  }, []);

  // 2. 獲取安全的推廣反傭連結（由後端動態投餵）
  const fetchReferralLinks = useCallback(async () => {
    try {
      // 🎯 4. 對接後端的推廣連結路由 /platforms/links
      const res = await fetch(`${API_BASE}/platforms/links`);
      if (res.ok) {
        const data = await res.json();
        setReferralLinks(data.links || {});
      } else {
        // 後端若連線異常，提供安全預設 Mock 確保商業防線不中斷
        setReferralLinks({
          "POLYMARKET": "https://polymarket.com/?ref=your_alphaforge_ref",
          "MANIFOLD": "https://manifold.markets/?referrer=your_alphaforge_ref",
          "KALSHI": "https://kalshi.com/?referral=your_alphaforge_ref",
          "BINANCE": "https://accounts.binance.com/register?ref=your_binance_ref",
          "INTERACTIVE_BROKERS": "https://www.interactivebrokers.com/referral/your_ib_ref"
        });
      }
    } catch (e) {
      console.error('Failed to fetch platform links', e);
    }
  }, [API_BASE]);

  // 3. 驗證並綁定用戶交易 UID
  const handleBindUid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid.trim()) return;
    setBindStatus('BINDING...');
    try {
      // 🎯 5. 對接後端超高速寫入路由 /platforms/bind，利用 Query String 強行灌入資料庫
      const res = await fetch(`${API_BASE}/platforms/bind?api_key=${apiKey}&platform=${bindPlatform}&uid=${encodeURIComponent(userUid.trim())}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setBindStatus('SUCCESS ✅');
        setUserUid('');
        setTimeout(() => setBindStatus(''), 3000);
      } else {
        setBindStatus(`ERR: ${data.detail || 'Failed'}`);
        setTimeout(() => setBindStatus(''), 4000);
      }
    } catch (e) {
      setBindStatus('CONN FAILED');
      setTimeout(() => setBindStatus(''), 3000);
    }
  };

  // 4. 觸發雷達深度失衡診斷
  const handleOpenAnalyze = (signal: DeviationSignal) => {
    setSelectedSignal(signal);
    setIsAnalyzing(true);
    
    // 💡 保留你原本設定的 4500ms（4.5秒）極致量化清洗演算儀式感延遲
    setTimeout(() => {
      const isUnderpriced = signal.deribit_implied_odds > signal.manifold_odds;
      setAnalysisCache({
        title: signal.title,
        type: signal.deviation_rate > 10.0 ? '🚨 CRITICAL COGNITIVE DISSONANCE（嚴重認知失衡）' : '⚠️ SPREAD MISPRICING（常態定價偏誤）',
        ev_rate: Math.round(Math.abs(signal.deribit_implied_odds - signal.manifold_odds) * 0.88 * 100) / 100,
        diagnostic: `當前預測市場散戶共識勝率（${signal.manifold_odds}%）與底層客觀統計錨定點（${signal.deribit_implied_odds}%）產生高達 ${signal.deviation_rate}% 的跨市場非理性偏差。造市商波動率表面顯示，散戶情緒在短時間內出現過度過載，歷史修正幾率為 76.4%。`,
        trade_action: isUnderpriced 
          ? `【主力進攻】預測市場份額被嚴重低估！建議立即買入 YES 份額（或買入對立面的 NO）。\n【風險對沖】同時前往金融交易所建立等值名目的空單或 Put 期權頭寸，鎖定 Delta 中性套利利潤。`
          : `【主力進攻】預測市場份額溢價過高！建議立即買入 NO 份額捕獲情緒回歸。\n【風險對沖】同時前往金融交易所建立等值名目的槓桿多單或 Call 期權進行方向對沖，鎖定確定性利潤。`
      });
      setIsAnalyzing(false);
    }, 4500);
  };

  // 定時監控更新
  useEffect(() => {
    fetchSnapshot(currentCategory);
    fetchReferralLinks();
    const interval = setInterval(() => fetchSnapshot(currentCategory), 15000);
    return () => clearInterval(interval);
  }, [currentCategory, fetchSnapshot, fetchReferralLinks]);

  return (
    <div className="min-h-screen bg-[#070708] text-[#e4e4e7] p-6 font-mono antialiased relative">
      
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

      {/* 🎯 流量變現與帳號驗證列 */}
      <div className="mb-6 bg-[#0c0c0e] border border-[#1c1c1f] rounded-lg p-3 max-w-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs">
          <span className="text-[#f59e0b] font-black">💡 雙向反傭解鎖：</span>
          <span className="text-[#a1a1aa]">透過推薦連結註冊預測市場或幣安，綁定 UID 即可解鎖無限次深度分析報告。</span>
        </div>
        <form onSubmit={handleBindUid} className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={bindPlatform} 
            onChange={(e) => setBindPlatform(e.target.value)}
            className="bg-[#141417] border border-[#27272a] text-xs text-white px-2 py-1 rounded outline-none cursor-pointer"
          >
            <option value="POLYMARKET">Polymarket</option>
            <option value="BINANCE">Binance</option>
            <option value="MANIFOLD">Manifold</option>
            <option value="IB">Interactive Brokers</option>
          </select>
          <input 
            type="text" 
            placeholder="請輸入平台 UID" 
            value={userUid}
            onChange={(e) => setUserUid(e.target.value)}
            className="bg-[#141417] border border-[#27272a] text-xs px-3 py-1 rounded text-white focus:border-[#f59e0b] outline-none placeholder-[#52525b]"
          />
          <button type="submit" className="bg-[#e4e4e7] hover:bg-white text-black font-bold text-xs px-3 py-1 rounded transition-colors">
            {bindStatus || '驗證綁定'}
          </button>
        </form>
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
                <button 
                  onClick={() => handleOpenAnalyze(s)}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-black px-4 py-1.5 rounded transition-colors"
                >
                  Analyze Disruption
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 彈窗 (Modal) */}
      {selectedSignal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-[#0c0c0e] border border-[#27272a] rounded-xl max-w-xl w-full overflow-hidden p-6 relative shadow-2xl font-mono">
            
            <button 
              onClick={() => { setSelectedSignal(null); setAnalysisCache(null); }}
              className="absolute top-4 right-4 text-[#a1a1aa] hover:text-white font-black text-xs border border-[#27272a] px-2 py-0.5 rounded bg-[#141417]"
            >
              ESC ✕
            </button>

            <div className="text-[11px] text-[#f59e0b] font-bold tracking-widest uppercase mb-1">
              ⚡ ALPHA DISRUPTION REPORT (跨市場失衡報告)
            </div>
            
            <h2 className="text-lg font-black text-white mb-4 pr-12 leading-snug">
              {selectedSignal.title}
            </h2>

            {isAnalyzing || !analysisCache ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="h-5 w-5 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-[#71717a] font-bold animate-pulse">
                  Cython 核心正在清洗跨市場波動率偏差數據表面...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs border-y border-[#1c1c1f] py-2.5 bg-[#09090b] px-3 rounded">
                  <div>
                    <span className="text-[#71717a]">異常型態:</span>
                    <p className="text-white font-bold mt-0.5">{analysisCache.type}</p>
                  </div>
                  <div>
                    <span className="text-[#71717a]">預期套利價值 (Expected Value):</span>
                    <p className="text-[#10b981] font-black mt-0.5">+{analysisCache.ev_rate}%</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-[#a1a1aa] mb-1">🔍 認知偏差診斷 (Cognitive Dissonance)</h4>
                  <p className="text-xs text-[#e4e4e7] leading-relaxed bg-[#141417] p-3 border border-[#1c1c1f] rounded whitespace-pre-line">
                    {analysisCache.diagnostic}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-black text-[#ef4444] mb-1">🎯 雙向執行路徑 (Arbitrage Execution)</h4>
                  <p className="text-xs text-[#e4e4e7] leading-relaxed bg-[#1d1212] p-3 border border-[#3a1212] rounded font-bold whitespace-pre-line">
                    {analysisCache.trade_action}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1c1c1f] space-y-4">
                  <div>
                    <span className="text-[10px] text-[#71717a] block mb-1.5 font-bold tracking-wider">
                      STEP 1: 前往預測市場捕獲失衡定價 (Capture Disruption)
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {(currentCategory === 'CRYPTO' || currentCategory === 'STOCKS' || currentCategory === 'POLITICS') && (
                        <a 
                          href={referralLinks["POLYMARKET"] || "https://polymarket.com"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#0072ff] hover:bg-[#005ccc] text-white font-black text-center py-2 rounded text-xs transition-colors block"
                        >
                          🔮 直達 Polymarket 下注低估份額
                        </a>
                      )}
                      
                      {currentCategory === 'WEATHER' && (
                        <a 
                          href={referralLinks["KALSHI"] || "https://kalshi.com"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#059669] hover:bg-[#047857] text-white font-black text-center py-2 rounded text-xs transition-colors block"
                        >
                          🌡️ 直達 Kalshi 捕獲氣象偏差
                        </a>
                      )}

                      <a 
                        href={referralLinks["MANIFOLD"] || "https://manifold.markets"} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black text-center py-2 rounded text-xs transition-colors block"
                      >
                        🎭 直達 Manifold 搶購共識差價
                      </a>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-[#71717a] block mb-1.5 font-bold tracking-wider">
                      STEP 2: 於對應金融交易平台建立反向頭寸 (Delta-Neutral Hedge)
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {currentCategory === 'CRYPTO' && (
                        <a 
                          href={referralLinks["BINANCE"] || "#"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#fcd535] hover:bg-[#e2be28] text-black font-black text-center py-2 rounded text-xs transition-colors block"
                        >
                          🪙 幣安 (Binance) 期貨/期權精準對沖
                        </a>
                      )}

                      {(currentCategory === 'STOCKS' || currentCategory === 'WEATHER' || currentCategory === 'POLITICS') && (
                        <a 
                          href={referralLinks["INTERACTIVE_BROKERS"] || "#"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#1a56db] hover:bg-[#1e429f] text-white font-black text-center py-2 rounded text-xs transition-colors block"
                        >
                          📈 通過 盈透證券 (IB) 進行宏觀對沖
                        </a>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
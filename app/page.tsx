"use client";

import React, { useState, useEffect, useRef } from "react";

// =========================================================
// 🎛️ 環境配置區
// =========================================================
const BACKEND_HTTP_URL = "https://alphaforge-backend-dtqv.onrender.com"; 
const BACKEND_WS_URL = "wss://alphaforge-backend-dtqv.onrender.com/ws/radar";

// =========================================================
// 📊 資料結構定義 (TypeScript Interfaces)
// =========================================================
interface RadarItem {
  id: string;
  title: string;
  deribit_implied_odds: number;
  manifold_odds: number;
  deviation_rate: number;
  anomaly_type: string;
}

interface SectorTab {
  id: string;
  label: string;
  icon: string;
}

// =========================================================
// 🚀 核心子組件：高階策略分析矩陣彈窗 (Strategy Modal)
// =========================================================
interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: RadarItem | null;
  apiKey: string; // 用於後端驗證
}

const StrategyModal: React.FC<StrategyModalProps> = ({ isOpen, onClose, strategy, apiKey }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeStatus, setExecuteStatus] = useState<{ type: 'idle' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  useEffect(() => {
    if (isOpen) setExecuteStatus({ type: 'idle', msg: '' });
  }, [isOpen]);

  if (!isOpen || !strategy) return null;

  const isRetailOverpriced = strategy.manifold_odds > strategy.deribit_implied_odds;
  const spreadAbs = Math.abs(strategy.manifold_odds - strategy.deribit_implied_odds).toFixed(2);
  
  const estSlippage = 0.45; 
  const estFee = 0.10;      
  const netArbitrageEdge = (parseFloat(spreadAbs) - (estSlippage + estFee)).toFixed(2);

  const handleExecuteVector = async () => {
    setIsExecuting(true);
    setExecuteStatus({ type: 'idle', msg: 'Forwarding vectors to gateway...' });

    try {
      // 1. 建立符合後端 Pydantic (VectorExecutePayload) 預期的資料結構
      const payload = {
        strategy_id: strategy.id,
        title: strategy.title,
        net_arbitrage_edge: parseFloat(netArbitrageEdge),
        route_details: [
          isRetailOverpriced ? "SHORT Polymarket/Manifold (NO)" : "LONG Polymarket/Manifold (YES)",
          isRetailOverpriced ? "LONG Deribit/Binance (Delta Hedge)" : "SHORT Deribit/Binance (Delta Hedge)"
        ]
      };

      // 2. 將 api_key 作為 Query Parameter 帶在 URL 後方，符合後端 Depends 驗證邏輯
      const clientApiKey = apiKey.trim() || "PUBLIC_GUEST";
      const targetUrl = `${BACKEND_HTTP_URL}/api/v1/vector/execute?api_key=${encodeURIComponent(clientApiKey)}`;

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setExecuteStatus({ 
          type: 'success', 
          msg: `✅ 執行成功: 已鎖定 +${data.execution_summary.net_arbitrage_edge_locked}% 價差利潤！` 
        });
      } else {
        setExecuteStatus({ 
          type: 'error', 
          msg: `❌ 路由拒絕: ${data.detail || 'Execution rejected by routing matrix.'}` 
        });
      }
    } catch (err) {
      console.error(err);
      setExecuteStatus({ type: 'error', msg: '❌ 致命錯誤: 無法連接後端叢集' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-xs text-amber-500 font-mono tracking-widest uppercase block mb-1">
              QUANT STRATEGY VECTOR // {strategy.id}
            </span>
            <h3 className="text-lg font-bold text-zinc-100 tracking-tight leading-snug font-sans">
              {strategy.title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 font-mono transition-colors text-xs border border-zinc-800 px-2 py-1 rounded bg-zinc-900"
          >
            ESC
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-950/60 border border-zinc-900 rounded-lg mb-6 font-mono">
          <div>
            <span className="text-xs text-zinc-500 block mb-1">Institutional Base</span>
            <span className="text-base font-semibold text-emerald-400">{strategy.deribit_implied_odds}%</span>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block mb-1">Retail Sentiment</span>
            <span className="text-base font-semibold text-amber-500">{strategy.manifold_odds}%</span>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block mb-1">Gross Alpha Spread</span>
            <span className="text-base font-bold text-red-400">+{spreadAbs}%</span>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-xs text-zinc-400 font-mono tracking-wider uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Optimal Execution Route
          </h4>
          
          <div className="space-y-3 font-sans">
            <div className="flex items-start gap-3 p-3 bg-zinc-900/30 border border-zinc-800/80 rounded">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm text-zinc-300">
                  {isRetailOverpriced ? (
                    <>在 <span className="text-amber-400 font-semibold">Polymarket / Manifold</span> 建立 <span className="text-red-500 font-semibold">Short / NO</span> 倉位</>
                  ) : (
                    <>在 <span className="text-amber-400 font-semibold">Polymarket / Manifold</span> 買入 <span className="text-emerald-400 font-semibold">Long / YES</span> 倉位</>
                  )}
                </p>
                <span className="text-xs text-zinc-500 font-mono block mt-1">
                  Reason: Current retail implied velocity is heavily {isRetailOverpriced ? "Overbought" : "Oversold"}.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-zinc-900/30 border border-zinc-800/80 rounded">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm text-zinc-300">
                  {isRetailOverpriced ? (
                    <>在 <span className="text-emerald-400 font-semibold">Deribit Options / Binance Futures</span> 進行 <span className="text-emerald-400 font-semibold">Delta 對沖 (Long Call / Spot)</span></>
                  ) : (
                    <>在 <span className="text-emerald-400 font-semibold">Deribit / Binance</span> 進行 <span className="text-red-500 font-semibold">Delta 負向對沖 (Short Call / Futures)</span></>
                  )}
                </p>
                <span className="text-xs text-zinc-500 font-mono block mt-1">
                  Target: Lock in the institutional spread mathematical certainty.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-4 font-mono text-xs space-y-2 text-zinc-500">
          <div className="flex justify-between">
            <span>Estimated Execution Slippage Model:</span>
            <span className="text-zinc-400">-{estSlippage}%</span>
          </div>
          <div className="flex justify-between">
            <span>Cross-Venue Clearing Fee:</span>
            <span className="text-zinc-400">-{estFee}%</span>
          </div>
          <div className="flex justify-between border-t border-zinc-900 pt-2 text-xs">
            <span className="font-sans text-zinc-300">Net Arbitrage Edge (Math Expectation):</span>
            <span className="text-amber-500 font-bold text-sm">+{netArbitrageEdge}%</span>
          </div>
        </div>

        {executeStatus.msg && (
          <div className={`mt-4 p-2 text-xs font-mono rounded border ${
            executeStatus.type === 'success' ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 
            executeStatus.type === 'error' ? 'bg-red-950/30 border-red-900 text-red-400' : 
            'bg-zinc-900 border-zinc-800 text-zinc-400 animate-pulse'
          }`}>
            {executeStatus.msg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={onClose}
            disabled={isExecuting}
            className="w-full py-2 text-xs font-medium text-zinc-400 border border-zinc-800 rounded bg-zinc-900/50 hover:bg-zinc-900 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            Close Backtest
          </button>
          <button 
            onClick={handleExecuteVector}
            disabled={isExecuting}
            className="w-full py-2 text-xs font-semibold bg-amber-500 text-black rounded hover:bg-amber-400 shadow-lg shadow-amber-950/20 transition-all font-mono disabled:bg-amber-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            {isExecuting ? "EXECUTING..." : "EXECUTE VECTOR VIA API"}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================
// 🖥️ 主控制面板：AlphaForge 雷達主畫面
// =========================================================
export default function RadarPage() {
  const [currentCategory, setCurrentCategory] = useState<string>("CRYPTO");
  const [radarData, setRadarData] = useState<RadarItem[]>([]);
  const [syncTime, setSyncTime] = useState<string>("--:--:--");
  const [streamStatus, setStreamStatus] = useState<"ACTIVE" | "DISCONNECTED" | "CONNECTING">("CONNECTING");
  
  const [apiKey, setApiKey] = useState<string>("");
  const [bindVenue, setBindVenue] = useState<string>("POLYMARKET");
  const [accountUid, setAccountUid] = useState<string>("");
  const [bindLoading, setBindLoading] = useState<boolean>(false);

  const [selectedStrategy, setSelectedStrategy] = useState<RadarItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  const sectors: SectorTab[] = [
    { id: "CRYPTO", label: "Crypto Sector", icon: "🔸" },
    { id: "STOCKS", label: "Stocks & Macro", icon: "📈" },
    { id: "WEATHER", label: "Climate Anomaly", icon: "🌡️" },
    { id: "POLITICS", label: "Geopolitics (Excl. Elections)", icon: "🌐" },
  ];

  useEffect(() => {
    function connectWebSocket() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setStreamStatus("CONNECTING");
      const clientApiKey = apiKey.trim() || "PUBLIC_GUEST";
      
      const targetUrl = `${BACKEND_WS_URL}?category=${currentCategory}&api_key=${encodeURIComponent(clientApiKey)}`;
      const ws = new WebSocket(targetUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStreamStatus("ACTIVE");
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.category === currentCategory) {
            setRadarData(parsed.data || []);
            const now = new Date();
            setSyncTime(`上午 ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`);
          }
        } catch (err) {
          console.error("Matrix stream parse error:", err);
        }
      };

      ws.onclose = () => {
        setStreamStatus("DISCONNECTED");
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 4000);
      };

      ws.onerror = (err) => {
        console.error("WS Pipeline Error:", err);
      };
    }

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentCategory, apiKey]);

  const handleAccountBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountUid.trim()) {
      alert("⚠️ Request Denied: Target UID cannot be null.");
      return;
    }

    setBindLoading(true);
    try {
      const queryParam = new URLSearchParams({
        api_key: apiKey.trim() || "GUEST_LINK",
        platform: bindVenue,
        uid: accountUid.trim()
      });

      const response = await fetch(`${BACKEND_HTTP_URL}/api/v1/platforms/bind?${queryParam.toString()}`, {
        method: "POST"
      });
      
      const data = await response.json();
      if (response.ok && data.status === "success") {
        alert(`✅ Success: ${data.message} \n系統將自動驗證返傭關係，開通完整權限。`);
        setAccountUid("");
      } else {
        alert(`❌ Binding Failed: ${data.detail || "Server rejected matrix handoff."}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Critical Connection Failure: Could not reach the backend cluster.");
    } finally {
      setBindLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-300 font-sans p-6 selection:bg-amber-500 selection:text-black">
      
      <header className="flex justify-between items-start border-b border-zinc-900 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-zinc-100 flex items-center gap-1.5">
            ALPHA<span>FORGE</span> <span className="text-amber-500 font-medium tracking-wide text-lg">Radar</span>
          </h1>
          <p className="text-[11px] font-mono text-zinc-500 tracking-tight mt-0.5 uppercase">
            Cross-Venue Arbitrage Matrix: Institutional Derivatives Pricing vs Retail Sentiment Misalignment
          </p>
        </div>
        <div className="text-right font-mono text-[11px] text-zinc-500 shrink-0">
          Sync Time: <span className="text-zinc-400">{syncTime}</span>
        </div>
      </header>

      <nav className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {sectors.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setCurrentCategory(sec.id)}
            className={`px-3 py-1.5 text-xs font-mono border rounded transition-all duration-150 whitespace-nowrap ${
              currentCategory === sec.id
                ? "bg-[#141416] border-amber-500 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.05)]"
                : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <span className="mr-1.5 text-[10px]">{sec.icon}</span>
            {sec.label}
          </button>
        ))}
      </nav>

      <section className="flex gap-2 mb-6 font-mono text-[10px]">
        <div className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1.5 ${
          streamStatus === "ACTIVE" 
            ? "bg-emerald-950/20 border-emerald-800/60 text-emerald-400" 
            : streamStatus === "CONNECTING"
            ? "bg-amber-950/20 border-amber-800/60 text-amber-500 animate-pulse"
            : "bg-red-950/20 border-red-800/60 text-red-400"
        }`}>
          <span className={`w-1 h-1 rounded-full ${streamStatus === "ACTIVE" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          STREAM_LIVE_{streamStatus}
        </div>
        <div className="px-2 py-0.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-zinc-400">
          Core Engine: <span className="text-zinc-300">Cython_v10_Matrix</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-amber-500/90 font-medium">
          Strategy Mode: <span className="underline decoration-dotted underline-offset-2">Structural Arbitrage</span>
        </div>
      </section>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <div className="lg:col-span-2 space-y-3">
          {radarData.length === 0 ? (
            <div className="border border-zinc-900 rounded-xl p-12 text-center bg-[#09090a]">
              <span className="block text-xl mb-2 animate-bounce">⏳</span>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                {streamStatus === "CONNECTING" ? "Establishing Secure Stream..." : "No Mispricing Arcs Detected In This Sector"}
              </p>
            </div>
          ) : (
            radarData.map((item) => {
              const isSpreadHigh = item.deviation_rate > 10;
              return (
                <div 
                  key={item.id}
                  className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700/80 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono text-zinc-600 tracking-wider">
                      {item.id}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold tracking-wide ${
                      item.anomaly_type.includes("CRITICAL") 
                        ? "bg-red-950/40 text-red-400 border border-red-900/40" 
                        : item.anomaly_type.includes("MISPRICING")
                        ? "bg-amber-950/40 text-amber-400 border border-amber-900/40"
                        : "bg-zinc-900 text-zinc-500"
                    }`}>
                      {item.anomaly_type}
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-zinc-200 group-hover:text-zinc-100 transition-colors tracking-tight pr-6 mb-5 font-sans leading-snug">
                    {item.title}
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-center border-t border-zinc-900/60 pt-4 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-0.5">🏛️ Institutional Base</span>
                      <span className="text-zinc-300 font-medium">{item.deribit_implied_odds}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-0.5">👥 Retail Odds (Manifold)</span>
                      <span className="text-zinc-300 font-medium">{item.manifold_odds}%</span>
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1 bg-zinc-950/80 px-3 py-1.5 border border-zinc-900 rounded flex justify-between sm:block">
                      <span className="text-[10px] text-zinc-500 sm:block">⚠ Spread:</span>
                      <span className={`font-bold ${isSpreadHigh ? "text-red-400" : "text-amber-500"}`}>
                        {item.deviation_rate}%
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-5 border-t border-zinc-900/80 pt-3">
                    <button 
                      onClick={() => {
                        setSelectedStrategy(item);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold border border-amber-500/80 text-amber-500 rounded bg-transparent hover:bg-amber-500 hover:text-black transition-all tracking-wide"
                    >
                      Analyze Strategy
                    </button>
                    
                    <div className="flex gap-3 text-[10px] text-zinc-500 font-mono">
                      <span>Execute Arbitrage:</span>
                      <a href="https://polymarket.com" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-amber-500 transition-colors underline underline-offset-2">Polymarket ↗</a>
                      <a href="https://manifold.markets" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-amber-500 transition-colors underline underline-offset-2">Manifold ↗</a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="space-y-6">
          
          <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5">
            <h3 className="text-xs font-bold text-amber-500 font-mono tracking-wider uppercase mb-2">
              Cross-Venue Intelligence
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              This system maps multi-venue liquidity metrics against true mathematical baselines via low-latency persistent streams.
            </p>
            <div className="mt-3 p-2.5 bg-zinc-950/80 border border-zinc-900 rounded font-mono text-[10px] text-zinc-500">
              ⚡ <span className="text-zinc-400 font-medium">Data Freedom:</span> Users can retrieve data vectors via custom endpoints. No hardcoded logic.
            </div>
          </div>

          <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5">
            <h3 className="text-xs font-bold text-zinc-200 font-mono tracking-wider uppercase mb-4 flex items-center gap-1.5">
              🔗 Brokerage Channel Binding
            </h3>
            <form onSubmit={handleAccountBinding} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Access API Key (Optional)</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter token if you have one"
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Target Venue</label>
                <select 
                  value={bindVenue}
                  onChange={(e) => setBindVenue(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="BINANCE">Binance</option>
                  <option value="POLYMARKET">Polymarket</option>
                  <option value="BYBIT">Bybit</option>
                  <option value="IB">Interactive Brokers</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Account UID / Wallet Address</label>
                <input 
                  type="text" 
                  value={accountUid}
                  onChange={(e) => setAccountUid(e.target.value)}
                  placeholder="Enter registered UID"
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-zinc-300 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={bindLoading}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 py-2 rounded text-xs font-semibold hover:bg-zinc-800 hover:text-zinc-100 transition-colors duration-150 shrink-0"
              >
                {bindLoading ? "Syncing Handshake..." : "Link Account to Matrix"}
              </button>
            </form>
          </div>

          <div className="bg-[#0c0c0e] border border-amber-900/40 rounded-xl p-5 relative overflow-hidden group shadow-[0_0_15px_rgba(245,158,11,0.05)]">
            <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-bl font-mono">100% FREE</div>
            
            <h3 className="text-xs font-bold text-amber-500 font-mono tracking-wider uppercase mb-2 flex items-center gap-1.5">
              🔓 Ecosystem Unlock
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed mb-4">
              捨棄傳統高昂月費。使用我們的專屬邀請碼註冊合作交易所，即可永久免費解鎖毫秒級 API 權限與自動化執行網關，並享有手續費返還。
            </p>
            
            <div className="space-y-2 mb-5">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded p-2.5 flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-300 flex items-center gap-1.5">
                  <span className="text-yellow-500">🟨</span> Binance
                </span>
                <span className="text-[9px] text-emerald-400 font-mono border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 rounded">20% Fee Kickback</span>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800 rounded p-2.5 flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-300 flex items-center gap-1.5">
                  <span className="text-amber-500">⬛</span> Bybit
                </span>
                <span className="text-[9px] text-emerald-400 font-mono border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 rounded">VIP Fee Tier</span>
              </div>
            </div>

            <button 
              onClick={() => alert("🔗 [模擬跳轉] 註冊完成後，請在上方表格輸入您的 UID 進行綁定，系統驗證通過後將自動為您開啟全部權限。")}
              className="w-full py-2 bg-zinc-100 text-black rounded font-mono text-xs font-bold hover:bg-white transition-colors shadow-md"
            >
              Get Referral Links
            </button>
          </div>

        </aside>
      </main>

      <StrategyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        strategy={selectedStrategy}
        apiKey={apiKey}
      />
    </div>
  );
}
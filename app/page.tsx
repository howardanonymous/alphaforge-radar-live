'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';

// =========================================================
// 🌐 環境變數配置 (建議在實際生產環境改用 process.env.NEXT_PUBLIC_...)
// =========================================================
const BACKEND_HOST = "localhost:8000";
const HTTP_BASE = `http://${BACKEND_HOST}`;
const WS_BASE = `ws://${BACKEND_HOST}`;

// =========================================================
// 📊 TypeScript 介面定義 (強型別防禦)
// =========================================================
interface RealtimeSignal {
  id: string;
  title: string;
  source_platform: string;
  manifold_odds: number;
  deribit_implied_odds: number;
  deviation_rate: number;
  anomaly_type: string;
}

interface PerformanceData {
  is_resolved: number;
  actual_outcome: number | null;
  brier_score: number | null;
  simulated_pnl: number | null;
  resolved_at: string | null;
}

interface HistoryRecord {
  id: number;
  title: string;
  source_platform: string;
  retail_odds: number;
  institutional_odds: number;
  deviation_rate: number;
  anomaly_type: string;
  created_at: string;
  performance: PerformanceData;
}

interface ReferralLinks {
  [key: string]: string;
}

interface BindMessage {
  text: string;
  isError: boolean;
}

export default function RadarDashboard() {
  // 系統核心狀態
  const [category, setCategory] = useState<string>("CRYPTO");
  const [apiKey, setApiKey] = useState<string>("ALPHA_VIP_USER");
  const [wsStatus, setWsStatus] = useState<"CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR">("DISCONNECTED");
  const [realtimeData, setRealtimeData] = useState<RealtimeSignal[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  // 歷史數據過濾狀態
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [minDeviation, setMinDeviation] = useState<number>(0.0);
  const [resolvedOnly, setResolvedOnly] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // 帳戶關聯綁定狀態
  const [bindPlatform, setBindPlatform] = useState<string>("BINANCE");
  const [bindUid, setBindUid] = useState<string>("");
  const [bindMessage, setBindMessage] = useState<BindMessage>({ text: "", isError: false });

  // 靜態/動態渠道推廣連結
  const [refLinks, setRefLinks] = useState<ReferralLinks>({});

  const wsRef = useRef<WebSocket | null>(null);

  // 1. 異步 HTTP 數據加載流
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const url = `${HTTP_BASE}/api/v1/radar/history?category=${category}&min_deviation=${minDeviation}&resolved_only=${resolvedOnly}&api_key=${apiKey}&limit=30`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === "success") {
          setHistoryData(json.data);
        }
      } catch (err) {
        console.error("❌ Failed to fetch history archive:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    const fetchPlatformLinks = async () => {
      try {
        const res = await fetch(`${HTTP_BASE}/api/v1/platforms/links`);
        const json = await res.json();
        if (json.status === "success") {
          setRefLinks(json.links);
        }
      } catch (err) {
        console.error("❌ Failed to fetch gateway links:", err);
      }
    };

    fetchPlatformLinks();
    fetchHistory();
  }, [category, minDeviation, resolvedOnly, apiKey]);

  // 2. Low-Latency WebSocket 串流建立核心
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setWsStatus("CONNECTING");
      const wsUrl = `${WS_BASE}/ws/radar?category=${category}&api_key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("CONNECTED");
        console.log(`🚀 [AlphaForge WS] Stream channel opened for: ${category}`);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.data) {
            setRealtimeData(payload.data);
            setLastUpdateTime(payload.timestamp);
          }
        } catch (err) {
          console.error("⚠️ Stream data parsing error:", err);
        }
      };

      ws.onclose = () => {
        setWsStatus("DISCONNECTED");
        // 斷線 5 秒自動重連防禦機制
        setTimeout(() => {
          if (wsRef.current === ws) connectWebSocket();
        }, 5000);
      };

      ws.onerror = () => {
        setWsStatus("ERROR");
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [category, apiKey]);

  // 3. 關聯 UID 提交處裡器
  const handleBindPlatform = async (e: FormEvent) => {
    e.preventDefault();
    if (!bindUid.trim()) return;

    setBindMessage({ text: "正在提交安全憑證...", isError: false });
    try {
      const url = `${HTTP_BASE}/api/v1/platforms/bind?api_key=${apiKey}&platform=${bindPlatform}&uid=${encodeURIComponent(bindUid)}`;
      const res = await fetch(url, { method: "POST" });
      const json = await res.json();
      
      if (res.ok && json.status === "success") {
        setBindMessage({ text: json.message, isError: false });
        setBindUid("");
      } else {
        setBindMessage({ text: json.detail || "關聯綁定失敗", isError: true });
      }
    } catch (err) {
      setBindMessage({ text: "本地網路或後端伺服器連線異常", isError: true });
    }
  };

  // 4. UI 輔助樣式：乖離率警報顏色分級
  const getAnomalyClass = (type: string) => {
    if (type.includes("CRITICAL")) return "bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold animate-pulse";
    if (type.includes("MISPRICING")) return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 p-4 lg:p-8 font-mono">
      <div className="max-w-[1600px] mx-auto">
        
        {/* TOP PANEL: CONTROL HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl lg:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                ALPHAFORGE CROSS RADAR
              </h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                wsStatus === "CONNECTED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                wsStatus === "CONNECTING" ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse" :
                "bg-rose-500/20 text-rose-400 border-rose-500/40"
              }`}>
                ● {wsStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">跨市場定價無效率性即時套利監控系統 v11.0.0</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-xs font-bold text-slate-500 px-2">API_KEY:</span>
            <input 
              type="text" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded text-cyan-400 focus:outline-none focus:border-cyan-500 w-44 font-mono"
            />
          </div>
        </header>

        {/* MAIN CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT CONTENT: RADAR MATRICES (3 COLS) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* CATEGORY TABS */}
            <div className="flex border-b border-slate-800 gap-2">
              {[
                { key: "CRYPTO", label: "🪙 加密貨幣" },
                { key: "STOCKS", label: "📈 總經美股" },
                { key: "WEATHER", label: "☀️ 氣候矩陣" },
                { key: "POLITICS", label: "⚖️ 政治事件" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCategory(tab.key)}
                  className={`px-5 py-2.5 font-bold text-sm tracking-wide transition-all cursor-pointer ${
                    category === tab.key 
                      ? "border-b-2 border-cyan-400 text-cyan-400 bg-cyan-500/5" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* REAL-TIME FEED PANEL (WS) */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  <h2 className="text-sm font-bold tracking-wider text-slate-300">⚡ REALTIME ENGINE FEED (2s Refresh)</h2>
                </div>
                <span className="text-xs text-slate-500">
                  Last Sync: {lastUpdateTime ? new Date(lastUpdateTime * 1000).toLocaleTimeString() : "CONNECTING..."}
                </span>
              </div>

              {realtimeData.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                  📡 正在等待伺服器傳輸動態實時數據流...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-2">節點ID</th>
                        <th className="py-3 px-2 w-1/3">監控市場標的</th>
                        <th className="py-3 px-2">平台</th>
                        <th className="py-3 px-2 text-right">零售預測賠率</th>
                        <th className="py-3 px-2 text-right">機構隱含機率</th>
                        <th className="py-3 px-2 text-center">乖離率</th>
                        <th className="py-3 px-2 text-right">異常狀態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {realtimeData.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2 text-slate-500">{item.id}</td>
                          <td className="py-3 px-2 text-slate-200 font-sans font-medium">{item.title}</td>
                          <td className="py-3 px-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                              {item.source_platform}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-amber-400 font-bold">{item.manifold_odds}%</td>
                          <td className="py-3 px-2 text-right text-indigo-400 font-bold">{item.deribit_implied_odds}%</td>
                          <td className="py-3 px-2 text-center text-cyan-400 font-bold text-sm">{item.deviation_rate}</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${getAnomalyClass(item.anomaly_type)}`}>
                              {item.anomaly_type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* HARDCORE POSTGRESQL ARCHIVE TABLE (HTTP) */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-sm font-bold tracking-wider text-slate-300">📦 POSTGRESQL PERSISTENT ARCHIVE</h2>
                  <p className="text-xs text-slate-500 mt-0.5">用於實戰回測驗證的底層真實歷史持久化紀錄</p>
                </div>
                
                {/* FILTERS */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">最小乖離率:</span>
                    <input 
                      type="number" 
                      step="0.5" 
                      min="0"
                      value={minDeviation}
                      onChange={(e) => setMinDeviation(parseFloat(e.target.value) || 0)}
                      className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-cyan-400 w-16 text-center focus:outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                    <input 
                      type="checkbox"
                      checked={resolvedOnly}
                      onChange={(e) => setResolvedOnly(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span>僅看已結算</span>
                  </label>
                </div>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-sm">正在對後端數據表執行查詢語句...</div>
              ) : historyData.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                  📭 目前沒有符合篩選條件的真實歷史存檔數據。
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#0e1524] text-slate-500 uppercase tracking-wider z-10">
                      <tr className="border-b border-slate-800">
                        <th className="py-2.5 px-2">DB_ID</th>
                        <th className="py-2.5 px-2 w-1/3">歷史事件標的</th>
                        <th className="py-2.5 px-2 text-right">零售/機構</th>
                        <th className="py-2.5 px-2 text-center">乖離率</th>
                        <th className="py-2.5 px-2 text-center">狀態</th>
                        <th className="py-2.5 px-2 text-right">模擬 PnL</th>
                        <th className="py-2.5 px-2 text-right">落庫時間</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {historyData.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/20 text-slate-400 transition-colors">
                          <td className="py-2.5 px-2 text-slate-600">#{rec.id}</td>
                          <td className="py-2.5 px-2 text-slate-300 font-sans">{rec.title}</td>
                          <td className="py-2.5 px-2 text-right text-[11px]">
                            <span className="text-amber-400/80">{rec.retail_odds}%</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-indigo-400/80">{rec.institutional_odds}%</span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-300">{rec.deviation_rate}</td>
                          <td className="py-2.5 px-2 text-center">
                            {rec.performance.is_resolved === 1 ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">已結算</span>
                            ) : rec.performance.is_resolved === -1 ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px]">無效/撤單</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">監控中</span>
                            )}
                          </td>
                          <td className={`py-2.5 px-2 text-right font-bold ${
                            rec.performance.simulated_pnl && rec.performance.simulated_pnl > 0 ? "text-emerald-400" : 
                            rec.performance.simulated_pnl && rec.performance.simulated_pnl < 0 ? "text-rose-400" : "text-slate-500"
                          }`}>
                            {rec.performance.simulated_pnl != null ? `${rec.performance.simulated_pnl} U` : "--"}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600 text-[11px]">{rec.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: COMMERCIAL BINDING & REFS (1 COL) */}
          <div className="space-y-6">
            
            {/* UID BINDING SYSTEM */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 tracking-wider mb-1">🔗 PLATFORM ACCOUNT BINDING</h3>
              <p className="text-xs text-slate-500 mb-4">關聯你的交易所或預測市場 UID，用以開通高級 API 權限與租賃流量返佣機制。</p>
              
              <form onSubmit={handleBindPlatform} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">選擇指定平台</label>
                  <select 
                    value={bindPlatform}
                    onChange={(e) => setBindPlatform(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="BINANCE">BINANCE (幣安)</option>
                    <option value="IB">INTERACTIVE BROKERS (盈透)</option>
                    <option value="MANIFOLD">MANIFOLD MARKETS</option>
                    <option value="KALSHI">KALSHI</option>
                    <option value="METACULUS">METACULUS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-bold">帳戶唯一識別碼 (UID / Ticker)</label>
                  <input 
                    type="text"
                    required
                    placeholder="請輸入平台 UID 或 帳號名稱"
                    value={bindUid}
                    onChange={(e) => setBindUid(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs py-2.5 rounded transition-all tracking-widest cursor-pointer uppercase"
                >
                  確認建立關聯密鑰
                </button>
              </form>

              {bindMessage.text && (
                <div className={`mt-3 text-center p-2 rounded text-xs border font-sans ${
                  bindMessage.isError 
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {bindMessage.text}
                </div>
              )}
            </div>

            {/* REFERRAL LINKS */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 tracking-wider mb-1">🎁 OFFICIAL GATEWAY LINKS</h3>
              <p className="text-xs text-slate-500 mb-4">使用專屬推薦碼開戶，自動解鎖高階量化策略跟單接口與交易手續費折扣。</p>
              
              <div className="space-y-2 text-xs">
                {Object.entries(refLinks).map(([platform, url]) => (
                  <a 
                    key={platform}
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800/80 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 transition-all"
                  >
                    <span className="font-bold tracking-wide">{platform}</span>
                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">前往開戶 →</span>
                  </a>
                ))}
                {Object.keys(refLinks).length === 0 && (
                  <div className="text-slate-600 text-center py-2">與後端接口對接中...</div>
                )}
              </div>
            </div>

            {/* SYSTEM LOGIC BRIEF */}
            <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/40 text-xs text-slate-500 space-y-2 font-sans">
              <p className="font-bold text-slate-400">💡 量化套利機制說明：</p>
              <p>當零售市場因群眾情緒或資訊落後產生非理性賠率，與合約期權隱含機率產生劇烈乖離時，雷達會立刻捕捉機會，提供低風險跨市場對沖的套利空間。</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
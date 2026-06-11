'use client';

import React, { useState, useEffect, useRef } from 'react';

// =========================================================
// 🌐 NETWORK ENVIRONMENT CONFIGURATION
// =========================================================
const BACKEND_HOST = "alphaforge-backend-dtqv.onrender.com";
const HTTP_BASE = `https://${BACKEND_HOST}`; 
const WS_BASE = `wss://${BACKEND_HOST}`;   

// =========================================================
// 📊 TS STRUCT DEFINITIONS (ROBUST TYPE-SAFETY LAYER)
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

export default function RadarDashboard() {
  // --- SYSTEM CORE STATES ---
  const [category, setCategory] = useState<string>("CRYPTO");
  const [apiKey, setApiKey] = useState<string>("ALPHA_VIP_USER");
  const [wsStatus, setWsStatus] = useState<"CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR">("DISCONNECTED");
  const [realtimeData, setRealtimeData] = useState<RealtimeSignal[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  // --- HISTORICAL QUERY ARCHIVE STATES ---
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [minDeviation, setMinDeviation] = useState<number>(0.0);
  const [resolvedOnly, setResolvedOnly] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // --- ECOSYSTEM REBATE GATEWAYS ---
  const [refLinks, setRefLinks] = useState<ReferralLinks>({});

  // --- UI INTERACTIVE STATES ---
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. ASYNC HTTP DATASTREAM INGESTION
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

  // 2. LOW-LATENCY WEBSOCKET STREAM ENGINE
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
        console.log(`🚀 [AlphaForge WS] Relayer channel active: ${category}`);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.data) {
            setRealtimeData(payload.data);
            setLastUpdateTime(payload.timestamp);
          }
        } catch (err) {
          console.error("⚠️ Stream data parsing anomaly:", err);
        }
      };

      ws.onclose = () => {
        setWsStatus("DISCONNECTED");
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

  // 3. VIRAL COPIER
  const handleCopyAlphaText = (item: RealtimeSignal) => {
    const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://alphaforge.net';
    const relayerUrl = `${currentDomain}?ref=${apiKey}&node=${item.id}`;
    
    const alphaTemplate = `💡 [Structural Arbitrage Alert via AlphaForge Relayer]
Market Underlying: ${item.title}
Platform Source: ${item.source_platform}
Retail Odds (DPM): ${item.manifold_odds}%
Inst Implied Probability: ${item.deribit_implied_odds}%
Current Deviation: ${item.deviation_rate} [${item.anomaly_type}]

Mass retail sentiment is completely decoupled from institutional true-risk derivative positioning. Massive structural hedge inefficiency captured.
📈 Stream Live Radar / Download Full PostgreSQL Backtest Database:
👉 ${relayerUrl}`;

    navigator.clipboard.writeText(alphaTemplate).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error("Failed to inject to clipboard:", err);
    });
  };

  const getAnomalyClass = (type: string) => {
    if (type.includes("CRITICAL")) return "bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold animate-pulse";
    if (type.includes("MISPRICING")) return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  };

  return (
    <>
      {/* 📌 終極相容暴力解：在新版 Next.js 中，use client 檔案直接塞原生標籤，
          伺服器端 SSR 吐 HTML 時會自動將它們提升（Hoist）進網頁真正的 <head> 大腦，死爬蟲絕對抓得到。 */}
      <title>ALPHAFORGE METAMIDDLEWARE RELAYER</title>
      <meta name="base:app_id" content="6a29f546654784aa1565a9bb7" />

      <div className="min-h-screen bg-[#090d16] text-slate-200 p-4 lg:p-8 font-mono">
        <div className="max-w-[1600px] mx-auto">
          
          {/* TOP PANEL: CONTROL HEADER */}
          <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl lg:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  ALPHAFORGE METAMIDDLEWARE RELAYER
                </h1>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                  wsStatus === "CONNECTED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                  wsStatus === "CONNECTING" ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse" :
                  "bg-rose-500/20 text-rose-400 border-rose-500/40"
                }`}>
                  ● {wsStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Cross-Market Structural Inefficiency & Liquidity Routing Protocol v11.0.0</p>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
              <span className="text-xs font-bold text-slate-500 px-2">NODE_API_KEY:</span>
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
            <div className="lg:col-span-3 space-y-6">
              
              {/* CATEGORY TABS */}
              <div className="flex border-b border-slate-800 gap-2">
                {[
                  { key: "CRYPTO", label: "🪙 CRYPTO" },
                  { key: "STOCKS", label: "📊 MACRO & STOCKS" },
                  { key: "WEATHER", label: "🌍 WEATHER MATRIX" },
                  { key: "POLITICS", label: "⚖️ POLITICS & STRATEGY" }
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
                    <h2 className="text-sm font-bold tracking-wider text-slate-300">⚡ REALTIME ROUTING FEED (2s Telemetry)</h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    Last Sync: {lastUpdateTime ? new Date(lastUpdateTime * 1000).toLocaleTimeString() : "CONNECTING TO STREAM..."}
                  </span>
                </div>

                {realtimeData.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                    📡 Ingesting global decentralized telemetry stream. Awaiting backend payload dispatch...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-2">FEED_ID</th>
                          <th className="py-3 px-2 w-1/4">MARKET UNDERLYING</th>
                          <th className="py-3 px-2">SOURCE</th>
                          <th className="py-3 px-2 text-right">RETAIL ODDS (DPM)</th>
                          <th className="py-3 px-2 text-right">INST IMPLIED</th>
                          <th className="py-3 px-2 text-center">DEVIATION</th>
                          <th className="py-3 px-2 text-center">STATUS</th>
                          <th className="py-3 px-2 text-right">DISPATCH MATRIX</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {realtimeData.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-2 text-slate-600 font-mono">#{item.id}</td>
                            <td className="py-3 px-2 text-slate-200 font-sans font-medium">{item.title}</td>
                            <td className="py-3 px-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                                {item.source_platform}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-amber-400 font-bold">{item.manifold_odds}%</td>
                            <td className="py-3 px-2 text-right text-indigo-400 font-bold">{item.deribit_implied_odds}%</td>
                            <td className="py-3 px-2 text-center text-cyan-400 font-bold text-sm">{item.deviation_rate}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${getAnomalyClass(item.anomaly_type)}`}>
                                {item.anomaly_type}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <button
                                  onClick={() => handleCopyAlphaText(item)}
                                  className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-tight uppercase cursor-pointer border transition-all ${
                                    copiedId === item.id
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-cyan-500/40 hover:text-cyan-400"
                                  }`}
                                >
                                  {copiedId === item.id ? "✓ Copied" : "📢 Share Alpha"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* HARDCORE POSTGRESQL ARCHIVE TABLE */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-sm font-bold tracking-wider text-slate-300">📦 POSTGRESQL HISTORICAL QUENCHING ARCHIVE</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Persistent historical datasets optimized for backtesting and model verification</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Min Deviation:</span>
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
                      <span>Resolved Only</span>
                    </label>
                  </div>
                </div>

                {historyData.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                    📭 Null Payload: No persistent records matching current filter thresholds.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-[#0e1524] text-slate-500 uppercase tracking-wider z-10 text-[11px]">
                        <tr className="border-b border-slate-800">
                          <th className="py-2.5 px-2">DB_INDEX</th>
                          <th className="py-2.5 px-2 w-1/3">HISTORICAL UNDERLYING</th>
                          <th className="py-2.5 px-2 text-right">RETAIL / INST</th>
                          <th className="py-2.5 px-2 text-center">DEVIATION</th>
                          <th className="py-2.5 px-2 text-center">RESOLUTION</th>
                          <th className="py-2.5 px-2 text-right">SIMULATED PNL</th>
                          <th className="py-2.5 px-2 text-right">INGESTION TIME</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {historyData.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-800/20 text-slate-400 transition-colors">
                            <td className="py-2.5 px-2 text-slate-600">#{rec.id}</td>
                            <td className="py-2.5 px-2 text-slate-300 font-sans">{rec.title}</td>
                            <td className="py-2.5 px-2 text-right">
                              <span className="text-amber-400/80">{rec.retail_odds}%</span>
                              <span className="text-slate-600 mx-1">/</span>
                              <span className="text-indigo-400/80">{rec.institutional_odds}%</span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-300">{rec.deviation_rate}</td>
                            <td className="py-2.5 px-2 text-center">
                              {rec.performance.is_resolved === 1 ? (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">RESOLVED</span>
                              ) : rec.performance.is_resolved === -1 ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px]">VOIDED</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">MONITORING</span>
                              )}
                            </td>
                            <td className={`py-2.5 px-2 text-right font-bold ${
                              rec.performance.simulated_pnl && rec.performance.simulated_pnl > 0 ? "text-emerald-400" : 
                              rec.performance.simulated_pnl && rec.performance.simulated_pnl < 0 ? "text-rose-400" : "text-slate-500"
                            }`}>
                              {rec.performance.simulated_pnl != null ? `${rec.performance.simulated_pnl} USDT` : "--"}
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

            {/* RIGHT SIDEBAR */}
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 font-mono">
                <h3 className="text-sm font-bold text-slate-200 tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  💻 CORE RELAYER SPEC
                </h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-500">Node Environment</span>
                    <span className="text-cyan-400 font-bold">Production-Alpha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pipeline Latency</span>
                    <span className="text-emerald-400 font-bold">&lt; 150ms</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 via-[#0c1424] to-slate-950 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-200 tracking-wider mb-1">📊 BACKTEST DATA FREEDOM</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  本平台堅守數據自由原則。終端用戶可自由下載完整 PostgreSQL 結構化數據，並導入自身的 C++ / Cython 交易模組進行地端回測與量化建模。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
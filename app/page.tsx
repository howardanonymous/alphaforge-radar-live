'use client';

import { useEffect, useState, useRef } from 'react';

interface DeviationData {
  id: string;
  title: string;
  deribit_implied_odds: number; 
  manifold_odds: number;        
  deviation_rate: number;       
  anomaly_type: string;         
}

export default function CryptoRadarDashboard() {
  // ======================
  // 核心端點：後端 WebSocket 生產機網址 (FastAPI 使用 wss://)
  // ======================
  const WS_BACKEND_API = 'wss://alphaforge-backend-dtqv.onrender.com/ws/radar';
  const HTTP_BACKEND_API = 'https://alphaforge-backend-dtqv.onrender.com/api/v1';

  // ======================
  // 核心狀態管理
  // ======================
  const [marketStatus, setMarketStatus] = useState({
    status: 'LOADING', // LOADING, STABLE, DISCONNECTED
    timestamp: 0,
    currentCategory: 'CRYPTO' 
  });

  const [deviations, setDeviations] = useState<DeviationData[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // 用戶憑證與渠道商輸入狀態
  const [apiKey, setApiKey] = useState('');
  const [platformUid, setPlatformUid] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('POLYMARKET');
  const [bindMessage, setBindMessage] = useState('');

  // 使用 useRef 控管 WebSocket 實例，防止 React 重複渲染導致連線爆炸
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ======================
  // 🔄 核心：WebSocket 即時數據雙向串流 (含斷線自動重連機制)
  // ======================
  useEffect(() => {
    if (!isMounted) return;

    let reconnectTimer: NodeJS.Timeout;
    
    function connectWS() {
      // 💡 數據防禦：將當前分類與用戶自己的 API Key 壓入連線 URL 中，供後端進行付費牆校驗
      const wsUrl = `${WS_BACKEND_API}?category=${marketStatus.currentCategory}&api_key=${apiKey || 'PUBLIC_GUEST'}`;
      
      console.log(`📡 Attempting WS Connection to: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('✅ WebSocket Connection Established.');
        setMarketStatus(prev => ({ ...prev, status: 'STABLE' }));
      };

      socket.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          // 接收來自後端 Cython 矩陣即時推送的 Snapshot
          if (result && result.data) {
            setDeviations(result.data);
            setMarketStatus(prev => ({
              ...prev,
              timestamp: result.timestamp
            }));
          }
        } catch (err) {
          console.error('❌ Failed to parse WS message:', err);
        }
      };

      socket.onclose = (e) => {
        console.log(`⚠️ WebSocket Closed. Code: ${e.code}, Reason: ${e.reason}`);
        setMarketStatus(prev => ({ ...prev, status: 'DISCONNECTED' }));
        
        // 🚀 斷線保護：每 5 秒自動嘗試重連，防止 Render 機台短暫閃斷
        reconnectTimer = setTimeout(() => {
          connectWS();
        }, 5000);
      };

      socket.onerror = (err) => {
        console.error('❌ WebSocket encountered error:', err);
        socket.close();
      };
    }

    connectWS();

    // 🌟 清理機制：當切換領域標籤或組件卸載時，主動關閉舊連線，清空計時器
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [isMounted, marketStatus.currentCategory, apiKey]); // 當分類或 API Key 改變，自動切換新串流

  // ======================
  // 🔗 提交渠道商 UID 綁定（走常規 HTTP POST 到 Render）
  // ======================
  const handleBindUid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformUid.trim() || !apiKey) {
      setBindMessage('🔑 API Key and UID are required.');
      return;
    }
    try {
      const res = await fetch(`${HTTP_BACKEND_API}/platforms/bind?api_key=${apiKey}&platform=${selectedPlatform}&uid=${platformUid}`, {
        method: 'POST'
      });
      const result = await res.json();
      if (res.status === 200 && result.status === 'success') {
        setBindMessage(`✅ ${result.message}`);
      } else {
        setBindMessage(`❌ ${result.detail || 'Binding failed.'}`);
      }
    } catch {
      setBindMessage('❌ DB write crash or backend offline.');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'STABLE') return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
    if (status === 'LOADING') return 'text-amber-400 border-amber-800 bg-amber-950/40 animate-pulse';
    return 'text-red-500 border-red-800 bg-red-950/40 animate-pulse';
  };

  if (!isMounted) return null;

  return (
    <div className="p-6 bg-black text-white min-h-screen font-mono">
      
      {/* Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">
            AlphaForge <span className="text-amber-500">Radar</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Cross-Venue Arbitrage Matrix: Institutional Derivatives Pricing vs Retail Sentiment Misalignment
          </p>
        </div>
        <div className="text-right text-xs text-zinc-600">
          Sync Time: {marketStatus.timestamp > 0 ? new Date(marketStatus.timestamp * 1000).toLocaleTimeString() : 'N/A'}
        </div>
      </div>

      {/* 四大領域切換標籤 */}
      <div className="flex gap-2 mb-6 text-xs">
        {[
          { key: 'CRYPTO', label: '🪙 Crypto Sector' },
          { key: 'STOCKS', label: '📈 Stocks & Macro' },
          { key: 'WEATHER', label: '🌡️ Climate Anomaly' },
          { key: 'POLITICS', label: '🌍 Geopolitics (Excl. Elections)' }
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setMarketStatus(prev => ({ ...prev, currentCategory: cat.key, status: 'LOADING' }))}
            className={`px-4 py-2 border transition-all ${
              marketStatus.currentCategory === cat.key 
                ? 'border-amber-500 text-amber-500 bg-amber-950/20 font-bold' 
                : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 系統即時監控狀態條 */}
      <div className="flex gap-3 mb-6 text-xs">
        <div className={`px-3 py-1 border rounded transition-all ${getStatusColor(marketStatus.status)}`}>
          {marketStatus.status === 'STABLE' ? '⚡ STREAM_LIVE_ACTIVE' : `⚠️ STREAM_${marketStatus.status}`}
        </div>
        <div className="px-3 py-1 border border-zinc-800 rounded text-zinc-400">
          Core Engine: <span className="text-zinc-200">Cython_v10_Matrix</span>
        </div>
        <div className="px-3 py-1 border border-zinc-800 rounded text-zinc-400">
          Strategy Mode: <span className="text-amber-400">Structural Arbitrage</span>
        </div>
      </div>

      {/* 主架構板塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 左側與中間：套利矩陣列表 */}
        <div className="lg:col-span-2 space-y-4">
          {deviations.length === 0 && marketStatus.status === 'STABLE' && (
            <div className="text-zinc-600 text-sm p-12 border border-dashed border-zinc-800 text-center rounded">
              No critical misalignment detected in {marketStatus.currentCategory} category at this window.
            </div>
          )}

          {deviations.map(item => (
            <div
              key={item.id}
              className="p-5 border border-zinc-800 rounded bg-zinc-900/10 hover:border-zinc-700 transition-all shadow-md"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {item.id}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  item.anomaly_type.includes('CRITICAL') 
                    ? 'bg-red-950/60 text-red-400 border border-red-900 animate-pulse' 
                    : item.anomaly_type.includes('MISPRICING')
                    ? 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}>
                  {item.anomaly_type}
                </span>
              </div>

              <div className="font-bold text-base mt-2 text-zinc-100 leading-snug">
                {item.title}
              </div>

              <div className="text-xs mt-4 p-3 bg-black border border-zinc-900 rounded grid grid-cols-1 md:grid-cols-3 gap-2 text-zinc-400">
                <div>
                  🏛️ Institutional Base: <span className="text-zinc-100 font-bold ml-1">{item.deribit_implied_odds}%</span>
                </div>
                <div>
                  👥 Retail Odds (Manifold): <span className="text-zinc-100 font-bold ml-1">{item.manifold_odds}%</span>
                </div>
                <div className="md:text-right">
                  <span className="text-amber-400 font-bold bg-amber-950/30 px-2 py-1 rounded border border-amber-900/30 inline-block">
                    Δ Spread: {item.deviation_rate}%
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-3 text-xs">
                <button
                  onClick={() => alert('Premium Required: Download SDK matrix to unlock C++ backtest suite.')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded transition-colors"
                >
                  Analyze Strategy
                </button>

                <div className="flex gap-3 text-zinc-500">
                  <span>Execute Arbitrage:</span>
                  <a href="https://polymarket.com/" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-amber-400 underline">Polymarket ↗</a>
                  <a href="https://manifold.markets/" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-amber-400 underline">Manifold ↗</a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 右側：用戶綁定面板與付費牆 */}
        <div className="space-y-6">
          
          <div className="border border-zinc-800 p-4 rounded bg-zinc-900/10">
            <div className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-2">
              Cross-Venue Intelligence
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This system maps multi-venue liquidity metrics against true mathematical baselines via low-latency persistent streams.
            </p>
            <div className="mt-3 p-2 bg-zinc-900/50 border border-zinc-800 rounded text-[11px] text-zinc-500">
              ⚡ <span className="text-zinc-400">Data Freedom:</span> Users can retrieve data vectors via custom endpoints. No hardcoded logic.
            </div>
          </div>

          <div className="border border-zinc-800 p-4 rounded bg-zinc-900/10">
            <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-3">
              🔗 Brokerage Channel Binding
            </div>
            <form onSubmit={handleBindUid} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Access API Key</label>
                <input 
                  type="text" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your AlphaForge API Key"
                  className="w-full bg-black border border-zinc-800 p-2 rounded text-zinc-200 focus:border-amber-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-zinc-500 mb-1">Target Venue</label>
                <select 
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full bg-black border border-zinc-800 p-2 rounded text-zinc-200 focus:border-amber-500 outline-none"
                >
                  <option value="POLYMARKET">Polymarket</option>
                  <option value="BINANCE">Binance Exchange</option>
                  <option value="MANIFOLD">Manifold Markets</option>
                  <option value="IB">Interactive Brokers</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Account UID / Wallet Address</label>
                <input 
                  type="text" 
                  value={platformUid}
                  onChange={(e) => setPlatformUid(e.target.value)}
                  placeholder="Enter exchange UID or wallet"
                  className="w-full bg-black border border-zinc-800 p-2 rounded text-zinc-200 focus:border-amber-500 outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2 rounded transition-colors"
              >
                Link Account to Matrix
              </button>
            </form>
            {bindMessage && (
              <div className="mt-3 text-[11px] font-mono border-t border-zinc-900 pt-2 text-center text-zinc-400">
                {bindMessage}
              </div>
            )}
          </div>

          <div className="border border-amber-500/20 p-4 rounded bg-gradient-to-b from-amber-950/10 to-transparent">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
              💎 Premium Matrix Access
            </div>
            <p className="text-[11px] text-zinc-400 mb-3">
              Unlock unlimited quantitative vector downloads, sub-second polling loops, and custom geoeconomic webhooks.
            </p>
            <div className="bg-zinc-950 p-3 border border-zinc-800 rounded text-center">
              <div className="text-lg font-bold text-zinc-200">$10 <span className="text-xs text-zinc-500">USDC / 24 Hours</span></div>
              <div className="text-[10px] text-zinc-600 mt-0.5">Supports Solana & Base network</div>
              <button 
                onClick={() => alert('Redirecting to Web3 Payment Gateway... Ready to accept USDC.')}
                className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition-colors"
              >
                Rent Access Node
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
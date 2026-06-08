"use client";
import { useEffect, useState, useCallback } from "react";

interface AlphaMetrics { edge_score: number; alpha_class: string; }
interface Signal { id: string; title: string; source_platform: string; deviation_rate: number; alpha: AlphaMetrics; }
interface DerivedMarket { id: string; title: string; market_type: string; }

export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [derived, setDerived] = useState<DerivedMarket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const ws = new WebSocket("wss://alphaforge-backend-dtqv.onrender.com/ws/radar");
    ws.onmessage = (e) => setSignals(JSON.parse(e.data).signals);
    
    fetch("https://alphaforge-backend-dtqv.onrender.com/api/v1/derived/list")
      .then(r => r.json()).then(d => setDerived(d.data));
    
    return () => ws.close();
  }, []);

  const handleCreate = useCallback(async (s: Signal) => {
    setLoading(true);
    try {
      const res = await fetch("https://alphaforge-backend-dtqv.onrender.com/api/v1/derived/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: s })
      });
      const data = await res.json();
      if (data.status === "success") {
        setDerived(prev => [data.market, ...prev]);
        window.open(`https://${s.source_platform.toLowerCase()}.markets/market/${s.id}`, "_blank");
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8 font-mono">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">AlphaForge <span className="text-emerald-500">v4.3</span></h1>
        <p className="text-zinc-500">Institutional Intelligence Layer</p>
      </header>

      <section className="border border-zinc-800 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900">
            <tr><th className="p-4 text-left">Market</th><th className="p-4 text-left">Alpha</th><th className="p-4 text-left">Action</th></tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                <td className="p-4">{s.title}</td>
                <td className="p-4 text-emerald-400">+{s.alpha.edge_score}%</td>
                <td className="p-4">
                  <button onClick={() => handleCreate(s)} disabled={loading} className="bg-zinc-800 hover:bg-emerald-600 px-3 py-1 rounded">
                    {loading ? "..." : "OPEN_POSITION"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="border border-zinc-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Derived Portfolio ({derived.length})</h2>
        <ul className="space-y-2">
          {derived.map((d) => (
            <li key={d.id} className="text-sm text-zinc-400">• {d.title} <span className="text-emerald-500">[{d.market_type}]</span></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
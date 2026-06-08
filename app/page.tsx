"use client";

import { useEffect, useState } from "react";

// =====================================================
// CONFIG
// =====================================================
const WS_URL =
  "wss://alphaforge-backend-dtqv.onrender.com/ws/radar";

const API_BASE =
  "https://alphaforge-backend-dtqv.onrender.com/api/v1";

// =====================================================
// TYPES (STRICT - NO ANY)
// =====================================================
interface Alpha {
  edge_score: number;
  confidence: number;
  exploitability: number;
  alpha_class: string;
}

interface Signal {
  id: string;
  title: string;
  source_platform: string;
  retail_odds: number;
  institutional_odds: number;
  deviation_rate: number;
  alpha?: Alpha;
}

interface DerivedMarket {
  id: string;
  parent_signal_id: string;
  title: string;
  entry_spread: number;
  market_type: string;
  status: string;
  created_at: number;
}

interface EventLog {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

// =====================================================
// PAGE
// =====================================================
export default function Page() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [derived, setDerived] = useState<DerivedMarket[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

  // =====================================================
  // WS
  // =====================================================
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload: unknown = JSON.parse(event.data);

        if (
          typeof payload === "object" &&
          payload !== null &&
          "data" in payload
        ) {
          const p = payload as { data: Signal[] };
          setSignals(p.data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => ws.close();
  }, []);

  // =====================================================
  // LOAD DATA
  // =====================================================
  useEffect(() => {
    fetch(`${API_BASE}/derived/list`)
      .then((r) => r.json())
      .then((d: { data: DerivedMarket[] }) =>
        setDerived(d.data ?? [])
      );

    fetch(`${API_BASE}/events`)
      .then((r) => r.json())
      .then((d: { data: EventLog[] }) =>
        setEvents(d.data ?? [])
      );
  }, []);

  // =====================================================
  // CREATE DERIVED
  // =====================================================
  const createDerived = async (signal: Signal): Promise<void> => {
    await fetch(`${API_BASE}/derived/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ signal }),
    });

    const res = await fetch(`${API_BASE}/derived/list`);
    const data: { data: DerivedMarket[] } = await res.json();
    setDerived(data.data ?? []);
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <main className="min-h-screen bg-black text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AlphaForge v4.3</h1>
          <p className="text-zinc-400">
            Investor-grade Cross-Market Intelligence Graph
          </p>
        </div>

        <div
          className={`px-3 py-1 rounded ${
            connected ? "bg-green-500 text-black" : "bg-red-500"
          }`}
        >
          {connected ? "LIVE" : "OFFLINE"}
        </div>
      </div>

      {/* SIGNALS */}
      <h2 className="text-xl mb-2">Signals</h2>

      <div className="space-y-2 mb-8">
        {signals.map((s: Signal) => (
          <div
            key={s.id}
            className="border border-zinc-800 p-3 rounded flex justify-between"
          >
            <div>
              <div className="font-bold">{s.title}</div>
              <div className="text-sm text-zinc-400">
                deviation: {s.deviation_rate}%
              </div>
            </div>

            <button
              onClick={() => createDerived(s)}
              className="px-3 py-1 bg-purple-600 rounded"
            >
              Create Derived
            </button>
          </div>
        ))}
      </div>

      {/* DERIVED */}
      <h2 className="text-xl mb-2">Derived Markets</h2>

      <div className="space-y-2 mb-8">
        {derived.map((d: DerivedMarket) => (
          <div
            key={d.id}
            className="border border-zinc-800 p-3 rounded"
          >
            <div className="font-bold">{d.title}</div>
            <div className="text-sm text-zinc-400">
              type: {d.market_type} | status: {d.status}
            </div>
          </div>
        ))}
      </div>

      {/* EVENTS */}
      <h2 className="text-xl mb-2">Event Log</h2>

      <div className="space-y-1">
        {events.slice(0, 10).map((e: EventLog, i: number) => (
          <div key={i} className="text-xs text-zinc-400">
            [{e.type}]{" "}
            {new Date(e.timestamp * 1000).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </main>
  );
}
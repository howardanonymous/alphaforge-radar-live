"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE = "https://alphaforge-backend-dtqv.onrender.com";

// =========================
// Types
// =========================
type Signal = {
  id?: string;
  symbol?: string;
  price?: number;
  deviation?: number;
  timestamp?: string;
};

type Status = "CONNECTING" | "LIVE" | "DEGRADED" | "OFFLINE";

// =========================
// Utils
// =========================
const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// =========================
// Component
// =========================
export default function Page() {
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [status, setStatus] = useState<Status>("CONNECTING");

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // =========================
  // REST fallback
  // =========================
  const fetchSignals = async () => {
    try {
      const res = await fetch(`${API_BASE}/signals`);
      const data: Signal[] = await res.json();

      const mapped: Record<string, Signal> = {};

      data.forEach((s) => {
        const key = s.id || s.symbol || Math.random().toString();
        mapped[key] = s;
      });

      setSignals(mapped);
      setStatus("DEGRADED");
    } catch {
      setStatus("OFFLINE");
    }
  };

  // =========================
  // WebSocket connect (robust)
  // =========================
  const connectWS = async () => {
    const wsUrl = API_BASE.replace("https", "wss") + "/ws/signals";

    setStatus("CONNECTING");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("LIVE");
      retryRef.current = 0;

      // heartbeat
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const data: Signal = JSON.parse(event.data);

        const key = data.id || data.symbol;
        if (!key) return;

        setSignals((prev) => {
          const prevSignal = prev[key];

          return {
            ...prev,
            [key]: {
              ...prevSignal,
              ...data,
            },
          };
        });
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    ws.onerror = async () => {
      setStatus("DEGRADED");
    };

    ws.onclose = async () => {
      setStatus("DEGRADED");

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      // exponential backoff reconnect
      retryRef.current += 1;
      const delay = Math.min(1000 * retryRef.current * 2, 15000);

      await sleep(delay);

      if (retryRef.current < 10) {
        connectWS();
      } else {
        await fetchSignals();
      }
    };
  };

  // =========================
  // init
  // =========================
  useEffect(() => {
    connectWS();

    return () => {
      wsRef.current?.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // =========================
  // UI
  // =========================
  const signalList = Object.values(signals);

  return (
    <main style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>AlphaForge Signal Dashboard v2</h1>

      {/* Status Bar */}
      <div style={{ marginBottom: 10 }}>
        Status:{" "}
        <b
          style={{
            color:
              status === "LIVE"
                ? "green"
                : status === "CONNECTING"
                ? "orange"
                : "red",
          }}
        >
          {status}
        </b>
      </div>

      <button onClick={fetchSignals}>Force REST Sync</button>

      {/* Signals */}
      <div style={{ marginTop: 20 }}>
        <h2>Live Signal Stream</h2>

        {signalList.length === 0 ? (
          <p>No signals</p>
        ) : (
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Deviation</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {signalList.map((s, i) => (
                <tr key={i}>
                  <td>{s.symbol || "-"}</td>
                  <td>{s.price ?? "-"}</td>
                  <td>{s.deviation ?? "-"}</td>
                  <td>{s.timestamp ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
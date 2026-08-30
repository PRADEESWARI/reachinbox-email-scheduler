import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Stats } from "../types";

/**
 * Live-metrics strip styled as a dispatch manifest ledger - a dashed
 * "route line" ties the three counters together, echoing a tracking
 * timeline (queued -> sent, with failures broken off the line).
 */
export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get<Stats>("/stats");
        if (mounted) setStats(res.data);
      } catch {
        // silent - stats are non-critical
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const cards = [
    { label: "In transit", value: stats?.scheduled ?? "—", accent: "text-ink-600", dot: "bg-ink-600" },
    { label: "Sent today", value: stats?.sentToday ?? "—", accent: "text-sent", dot: "bg-sent" },
    { label: "Failed", value: stats?.failed ?? "—", accent: "text-postal-600", dot: "bg-postal-600" },
  ];

  return (
    <div className="border-b border-ink-100 bg-white px-6 py-4">
      <div className="flex items-center">
        {cards.map((c, i) => (
          <div key={c.label} className="flex items-center">
            <div className="flex items-center gap-2.5 pr-6">
              <span className={`h-2 w-2 rounded-full ${c.dot}`} />
              <div>
                <div className="eyebrow text-ink-400">{c.label}</div>
                <div className={`font-mono text-xl font-semibold leading-tight ${c.accent}`}>{c.value}</div>
              </div>
            </div>
            {i < cards.length - 1 && (
              <div className="hidden sm:block w-16 border-t border-dashed border-ink-100 mx-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

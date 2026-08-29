import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Stats } from "../types";

/**
 * Live-metrics strip - polls /api/stats every 5s. Elegant glass cards with
 * a soft glow accent on the primary metric, rather than a plain grid.
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
    {
      label: "Sent today",
      value: stats?.sentToday,
      accent: "text-void-900",
      chip: "bg-gold-gradient text-void-950",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "In transit",
      value: stats?.scheduled,
      accent: "text-void-900",
      chip: "bg-void-900 text-white",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Failed",
      value: stats?.failed,
      accent: "text-void-900",
      chip: "bg-danger/15 text-danger",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4M12 17h.01M10.3 3.9L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-in">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl bg-white border border-void-100 shadow-card px-5 py-4 flex items-center gap-4"
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.chip}`}>
            {c.icon}
          </div>
          <div>
            <div className="eyebrow text-void-400">{c.label}</div>
            <div className={`font-mono text-2xl font-semibold leading-tight mt-0.5 ${c.accent}`}>
              {c.value ?? "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

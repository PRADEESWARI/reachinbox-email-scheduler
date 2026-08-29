import { ScheduledEmailRow } from "../types";

interface Props {
  rows: ScheduledEmailRow[];
  loading: boolean;
  mode: "scheduled" | "sent";
}

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-void-100 text-void-600",
  PENDING: "bg-void-100 text-void-400",
  RATE_DELAYED: "bg-delayed/15 text-delayed",
  SENT: "bg-sent/15 text-sent",
  FAILED: "bg-danger/15 text-danger",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-4"><div className="h-4 w-40 rounded shimmer" /></td>
      <td className="px-5 py-4"><div className="h-4 w-52 rounded shimmer" /></td>
      <td className="px-5 py-4"><div className="h-4 w-32 rounded shimmer" /></td>
      <td className="px-5 py-4"><div className="h-5 w-20 rounded-full shimmer" /></td>
    </tr>
  );
}

export default function EmailTable({ rows, loading, mode }: Props) {
  const timeLabel = mode === "scheduled" ? "Scheduled" : "Sent";

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-void-100 shadow-card overflow-hidden">
        <table className="min-w-full">
          <tbody className="divide-y divide-void-100">
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-void-200 bg-white/60 fade-in">
        <div className="h-14 w-14 rounded-2xl bg-gold-gradient/20 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C89A42" strokeWidth="1.6">
            <path d="M4 4h16v16H4z" strokeLinejoin="round" />
            <path d="M4 6l8 7 8-7" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-void-600 font-medium text-sm">
          No {mode} emails yet
        </p>
        {mode === "scheduled" && (
          <p className="text-void-400 text-sm mt-1">Compose one to get started</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-void-100 shadow-card overflow-hidden fade-in">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-void-100">
            <th className="px-5 py-3.5 text-left eyebrow text-void-400 font-medium">Recipient</th>
            <th className="px-5 py-3.5 text-left eyebrow text-void-400 font-medium">Subject</th>
            <th className="px-5 py-3.5 text-left eyebrow text-void-400 font-medium">{timeLabel}</th>
            <th className="px-5 py-3.5 text-left eyebrow text-void-400 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-void-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-void-50/60 transition-colors group">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-void-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {initials(row.recipient)}
                  </div>
                  <span className="text-void-900 font-medium">{row.recipient}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-void-600">{row.subject}</td>
              <td className="px-5 py-4 text-void-400 font-mono text-xs">
                {new Date(mode === "scheduled" ? row.scheduledAt : row.sentAt || row.scheduledAt).toLocaleString()}
              </td>
              <td className="px-5 py-4">
                <span className={`pill ${statusStyles[row.status] || "bg-void-100 text-void-600"}`}>
                  <span className="pill-dot" />
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

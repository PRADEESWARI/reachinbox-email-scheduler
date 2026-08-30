import { ScheduledEmailRow } from "../types";

interface Props {
  rows: ScheduledEmailRow[];
  loading: boolean;
  mode: "scheduled" | "sent";
}

// Postmark-stamp status colors - text color also draws the dashed ring
// via currentColor (see .stamp in index.css).
const statusStyles: Record<string, string> = {
  SCHEDULED: "text-ink-600 bg-ink-50",
  PENDING: "text-ink-400 bg-ink-50",
  RATE_DELAYED: "text-delayed bg-amber-50",
  SENT: "text-sent bg-green-50",
  FAILED: "text-postal-600 bg-postal-50",
};

export default function EmailTable({ rows, loading, mode }: Props) {
  const timeLabel = mode === "scheduled" ? "Scheduled time" : "Sent time";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-ink-400 eyebrow">
        Loading {mode} emails…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-ink-100 rounded-sm bg-white">
        <div className="text-3xl mb-2">✉️</div>
        <p className="font-mono text-sm text-ink-400">
          No {mode} emails yet{mode === "scheduled" ? " — compose one to get started." : "."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-ink-100 bg-white">
      <table className="min-w-full divide-y divide-ink-100 text-sm">
        <thead className="bg-ink-900">
          <tr>
            <th className="px-4 py-3 text-left eyebrow text-ink-100/70">Email</th>
            <th className="px-4 py-3 text-left eyebrow text-ink-100/70">Subject</th>
            <th className="px-4 py-3 text-left eyebrow text-ink-100/70">{timeLabel}</th>
            <th className="px-4 py-3 text-left eyebrow text-ink-100/70">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-50">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-paper/60">
              <td className="px-4 py-3 font-mono text-ink-800">{row.recipient}</td>
              <td className="px-4 py-3 text-ink-600">{row.subject}</td>
              <td className="px-4 py-3 text-ink-400 font-mono text-xs">
                {new Date(mode === "scheduled" ? row.scheduledAt : row.sentAt || row.scheduledAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className={`stamp ${statusStyles[row.status] || "text-ink-600 bg-ink-50"}`}>
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

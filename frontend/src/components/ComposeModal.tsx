import { useState } from "react";
import { api } from "../api/client";
import { Sender } from "../types";

interface Props {
  senders: Sender[];
  onClose: () => void;
  onScheduled: () => void;
}

export default function ComposeModal({ senders, onClose, onScheduled }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderId, setSenderId] = useState(senders[0]?.id || "");
  const [emails, setEmails] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/leads/parse", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setEmails(res.data.emails);
  }

  async function handleSubmit() {
    setError("");
    if (!subject || !body || !senderId || emails.length === 0) {
      setError("Subject, body, sender, and at least one recipient are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/campaigns", {
        subject,
        body,
        senderId,
        recipients: emails,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        delayMs,
        hourlyLimit,
      });
      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to schedule campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div className="w-full max-w-lg rounded-sm bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto border-t-4 border-postal-500">
        <div className="eyebrow text-postal-600 mb-1">New dispatch</div>
        <h2 className="text-lg font-semibold text-ink-800 mb-4">Compose new email</h2>

        {error && (
          <div className="mb-3 rounded-sm bg-postal-50 border border-postal-100 px-3 py-2 text-sm text-postal-700">{error}</div>
        )}

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs text-postal-500">01</span>
              <span className="eyebrow text-ink-400">Message</span>
              <span className="flex-1 border-t border-dashed border-ink-100" />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block eyebrow text-ink-600 mb-1.5">Sender</label>
                <select
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className="w-full rounded-sm border border-ink-100 px-3 py-2 text-sm focus:outline-none focus:border-postal-500"
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} &lt;{s.email}&gt;
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block eyebrow text-ink-600 mb-1.5">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-sm border border-ink-100 px-3 py-2 text-sm focus:outline-none focus:border-postal-500"
                  placeholder="Quick question about your team's outreach"
                />
              </div>

              <div>
                <label className="block eyebrow text-ink-600 mb-1.5">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="w-full rounded-sm border border-ink-100 px-3 py-2 text-sm focus:outline-none focus:border-postal-500"
                  placeholder="Hi {{firstName}}, ..."
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs text-postal-500">02</span>
              <span className="eyebrow text-ink-400">Recipients</span>
              <span className="flex-1 border-t border-dashed border-ink-100" />
            </div>

            <label className="block eyebrow text-ink-600 mb-1.5">Upload leads (CSV/text)</label>
            <input type="file" accept=".csv,.txt" onChange={handleFile} className="text-sm" />
            {fileName && (
              <p className="mt-1 text-xs font-mono text-ink-400">
                {fileName} — {emails.length} email address{emails.length === 1 ? "" : "es"} detected
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs text-postal-500">03</span>
              <span className="eyebrow text-ink-400">Timing &amp; limits</span>
              <span className="flex-1 border-t border-dashed border-ink-100" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block eyebrow text-ink-600 mb-1.5">Start time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-sm border border-ink-100 px-2 py-2 text-sm font-mono focus:outline-none focus:border-postal-500"
                />
              </div>
              <div>
                <label className="block eyebrow text-ink-600 mb-1.5">Delay (ms)</label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="w-full rounded-sm border border-ink-100 px-2 py-2 text-sm font-mono focus:outline-none focus:border-postal-500"
                />
              </div>
              <div>
                <label className="block eyebrow text-ink-600 mb-1.5">Hourly limit</label>
                <input
                  type="number"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full rounded-sm border border-ink-100 px-2 py-2 text-sm font-mono focus:outline-none focus:border-postal-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-sm border border-ink-100 px-4 py-2 text-sm text-ink-600 hover:bg-paper"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-sm bg-postal-500 px-4 py-2 text-sm font-medium text-white hover:bg-postal-600 disabled:opacity-50"
          >
            {submitting ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  const inputClass =
    "w-full rounded-xl border border-void-200 bg-void-50/50 px-3.5 py-2.5 text-sm text-void-900 placeholder:text-void-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all";
  const labelClass = "block text-xs font-medium text-void-600 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/60 backdrop-blur-sm p-4 fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="px-7 pt-7 pb-5 border-b border-void-100 sticky top-0 bg-white/95 backdrop-blur rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-glow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E1019" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-void-900 leading-none">New campaign</h2>
              <p className="eyebrow text-void-400 mt-1">Compose &amp; schedule</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          {error && (
            <div className="mb-5 rounded-xl bg-danger/10 border border-danger/20 px-4 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>Sender</label>
                <select
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className={inputClass}
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} &lt;{s.email}&gt;
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                  placeholder="Quick question about your team's outreach"
                />
              </div>

              <div>
                <label className={labelClass}>Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className={inputClass}
                  placeholder="Hi {{firstName}}, ..."
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Upload leads</label>
              <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-void-200 hover:border-gold-400 px-4 py-3.5 cursor-pointer transition-colors group">
                <div className="h-9 w-9 rounded-lg bg-void-100 group-hover:bg-gold-500/15 flex items-center justify-center shrink-0 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-void-600 group-hover:text-gold-600">
                    <path d="M12 3v12M7 8l5-5 5 5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-void-700 font-medium">
                    {fileName || "CSV or text file"}
                  </div>
                  <div className="text-xs text-void-400">
                    {fileName
                      ? `${emails.length} email address${emails.length === 1 ? "" : "es"} detected`
                      : "Click to browse"}
                  </div>
                </div>
                <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              </label>
            </div>

            <div>
              <div className="eyebrow text-void-400 mb-2.5">Timing &amp; limits</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Start time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`${inputClass} font-mono text-xs px-2.5`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Delay (ms)</label>
                  <input
                    type="number"
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className={`${inputClass} font-mono text-xs px-2.5`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Hourly limit</label>
                  <input
                    type="number"
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Number(e.target.value))}
                    className={`${inputClass} font-mono text-xs px-2.5`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-7 py-5 border-t border-void-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-void-200 px-5 py-2.5 text-sm font-medium text-void-600 hover:bg-void-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-void-950 shadow-glow hover:brightness-105 active:brightness-95 disabled:opacity-50 transition-all"
          >
            {submitting ? "Scheduling…" : "Schedule campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "./api/client";
import { ScheduledEmailRow, Sender, User } from "./types";
import Header from "./components/Header";
import StatsBar from "./components/StatsBar";
import EmailTable from "./components/EmailTable";
import ComposeModal from "./components/ComposeModal";

type Tab = "scheduled" | "sent";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [rows, setRows] = useState<ScheduledEmailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [senders, setSenders] = useState<Sender[]>([]);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));

    // Handle the redirect back from /api/auth/google/callback, which
    // appends ?token=...&user=... on the /auth/callback path.
    if (window.location.pathname === "/auth/callback" || window.location.search.includes("token=")) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const userParam = params.get("user");
      if (token && userParam) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", userParam);
        setUser(JSON.parse(userParam));
      }
      window.history.replaceState({}, "", "/");
    }
  }, []);

  function handleLogin() {
    // Real redirect into the backend's Google OAuth flow (passport-google-oauth20).
    const baseURL = import.meta.env.VITE_API_URL || "";
    window.location.href = `${baseURL}/api/auth/google`;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  async function loadSenders() {
    const res = await api.get<Sender[]>("/senders");
    if (res.data.length === 0) {
      // Seed a couple of demo senders so Compose isn't empty on first run.
      const seeded = await Promise.all([
        api.post("/senders", { name: "Alex from ReachInbox", email: "alex@reachinbox.dev" }),
        api.post("/senders", { name: "Outreach Bot", email: "outreach@reachinbox.dev" }),
      ]);
      setSenders(seeded.map((r) => r.data));
    } else {
      setSenders(res.data);
    }
  }

  async function loadRows() {
    setLoading(true);
    try {
      const endpoint = tab === "scheduled" ? "/emails/scheduled" : "/emails/sent";
      const res = await api.get<ScheduledEmailRow[]>(endpoint, { params: { search } });
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadSenders();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadRows();
    const interval = setInterval(loadRows, 4000); // light polling for live-ish updates
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab, search]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-full max-w-sm rounded-sm border border-ink-100 bg-white p-8 text-center shadow-sm">
          <svg width="44" height="44" viewBox="0 0 34 34" fill="none" className="mx-auto mb-4">
            <circle cx="17" cy="17" r="15.5" stroke="#C4472C" strokeWidth="1.4" strokeDasharray="2.5 2.5" />
            <circle cx="17" cy="17" r="10.5" stroke="#C4472C" strokeWidth="1" />
            <text x="17" y="20" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="8.5" fill="#C4472C" fontWeight="600">
              RI
            </text>
          </svg>
          <h1 className="text-lg font-semibold text-ink-800 mb-1">ReachInbox Scheduler</h1>
          <p className="mb-6 text-sm text-ink-400">Sign in to manage your email campaigns.</p>
          <button
            onClick={handleLogin}
            className="w-full rounded-sm bg-ink-900 py-2.5 text-sm font-medium text-white hover:bg-postal-600 transition-colors"
          >
            Continue with Google
          </button>
          <p className="mt-3 eyebrow text-ink-100">
            Signs in with your real Google account
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header user={user} onLogout={handleLogout} />
      <StatsBar />

      <main className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {(["scheduled", "sent"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-t-sm border-b-2 px-4 py-2 text-sm font-mono uppercase tracking-wide transition-colors ${
                  tab === t
                    ? "border-postal-500 text-ink-900 bg-white"
                    : "border-transparent text-ink-400 hover:text-ink-600"
                }`}
              >
                {t} emails
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by recipient or subject…"
              className="rounded-sm border border-ink-100 px-3 py-2 text-sm w-64 font-mono focus:outline-none focus:border-postal-500"
            />
            <button
              onClick={() => setShowCompose(true)}
              className="rounded-sm bg-postal-500 px-4 py-2 text-sm font-medium text-white hover:bg-postal-600 transition-colors"
            >
              + Compose new email
            </button>
          </div>
        </div>

        <EmailTable rows={rows} loading={loading} mode={tab} />
      </main>

      {showCompose && (
        <ComposeModal
          senders={senders}
          onClose={() => setShowCompose(false)}
          onScheduled={loadRows}
        />
      )}
    </div>
  );
}

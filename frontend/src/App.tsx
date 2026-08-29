import { useEffect, useState } from "react";
import { api } from "./api/client";
import { ScheduledEmailRow, Sender, User } from "./types";
import Sidebar from "./components/Sidebar";
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
    if (window.location.pathname === "/auth/callback") {
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
    window.location.href = "/api/auth/google";
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
      <div className="relative min-h-screen flex items-center justify-center bg-void-950 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 20% 20%, rgba(200,154,66,0.15), transparent 40%), radial-gradient(800px circle at 80% 80%, rgba(200,154,66,0.08), transparent 40%)",
          }}
        />
        <div className="relative w-full max-w-sm rounded-3xl bg-white shadow-panel p-9 text-center fade-in">
          <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-glow">
            <span className="font-bold text-void-950 text-xl">R</span>
          </div>
          <h1 className="text-xl font-bold text-void-900 mb-1 tracking-tight">ReachInbox Scheduler</h1>
          <p className="mb-7 text-sm text-void-400">Sign in to manage your email campaigns</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-void-900 py-3 text-sm font-semibold text-white hover:bg-void-800 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 10.8v3.6h5.04c-.22 1.32-1.6 3.88-5.04 3.88-3.04 0-5.52-2.52-5.52-5.6s2.48-5.6 5.52-5.6c1.73 0 2.89.74 3.55 1.37l2.42-2.34C16.62 4.5 14.5 3.6 12 3.6c-4.64 0-8.4 3.76-8.4 8.4s3.76 8.4 8.4 8.4c4.85 0 8.06-3.4 8.06-8.19 0-.55-.06-.97-.13-1.4H12z" />
            </svg>
            Continue with Google
          </button>
          <p className="mt-4 eyebrow text-void-200">Real Google account required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-void-50">
      <Sidebar
        user={user}
        tab={tab}
        onTabChange={setTab}
        onCompose={() => setShowCompose(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
            <div>
              <h1 className="text-2xl font-bold text-void-900 tracking-tight capitalize">{tab} emails</h1>
              <p className="text-sm text-void-400 mt-0.5">
                {tab === "scheduled" ? "Campaigns queued for delivery" : "Delivered and failed sends"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-void-400"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search recipient or subject…"
                  className="rounded-xl border border-void-200 bg-white pl-10 pr-4 py-2.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500 transition-all"
                />
              </div>
              <button
                onClick={() => setShowCompose(true)}
                className="md:hidden rounded-xl bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-void-950 shadow-glow"
              >
                + Compose
              </button>
            </div>
          </div>

          <div className="mb-7">
            <StatsBar />
          </div>

          <EmailTable rows={rows} loading={loading} mode={tab} />
        </div>
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

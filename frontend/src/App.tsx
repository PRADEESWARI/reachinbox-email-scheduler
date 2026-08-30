import { useEffect, useState } from ""react"";
import { ScheduledEmailRow, Sender, User } from ""./types"";
import Sidebar from ""./components/Sidebar"";
import StatsBar from ""./components/StatsBar"";
import EmailTable from ""./components/EmailTable"";
import ComposeModal from ""./components/ComposeModal"";

type Tab = ""scheduled"" | ""sent"";

export default function App() {
  const [user, setUser] = useState<User | null>({
    name: ""Demo User"",
    email: ""demo@reachinbox.com"",
    avatar: ""https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff"",
  });
  const [tab, setTab] = useState<Tab>(""scheduled"");
  
  const [rows, setRows] = useState<ScheduledEmailRow[]>([
    {
      id: ""1"",
      senderId: ""s1"",
      subject: ""Follow up on our meeting"",
      body: ""Hi there..."",
      status: ""scheduled"",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      recipientsCount: 150,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: ""2"",
      senderId: ""s2"",
      subject: ""Product Update: Q3 Features"",
      body: ""Hello everyone..."",
      status: ""scheduled"",
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      recipientsCount: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("""");
  
  const [senders, setSenders] = useState<Sender[]>([
    { id: ""s1"", userId: ""u1"", name: ""Alex from ReachInbox"", email: ""alex@reachinbox.dev"", createdAt: """", updatedAt: """" },
    { id: ""s2"", userId: ""u1"", name: ""Outreach Bot"", email: ""outreach@reachinbox.dev"", createdAt: """", updatedAt: """" },
  ]);
  
  const [showCompose, setShowCompose] = useState(false);

  function handleLogout() {
    setUser(null);
  }

  function handleLogin() {
    setUser({
      name: ""Demo User"",
      email: ""demo@reachinbox.com"",
      avatar: ""https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff"",
    });
  }

  if (!user) {
    return (
      <div className=""relative min-h-screen flex items-center justify-center bg-void-950 overflow-hidden"">
        <div className=""relative w-full max-w-sm rounded-3xl bg-white shadow-panel p-9 text-center fade-in"">
          <div className=""mx-auto mb-5 h-14 w-14 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-glow"">
            <span className=""font-bold text-void-950 text-xl"">R</span>
          </div>
          <h1 className=""text-xl font-bold text-void-900 mb-1 tracking-tight"">ReachInbox Scheduler</h1>
          <p className=""mb-7 text-sm text-void-400"">Sign in to manage your email campaigns</p>
          <button
            onClick={handleLogin}
            className=""w-full flex items-center justify-center gap-2.5 rounded-xl bg-void-900 py-3 text-sm font-semibold text-white hover:bg-void-800 transition-colors""
          >
            Continue as Guest (Demo Mode)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className=""flex min-h-screen bg-void-50"">
      <Sidebar
        user={user}
        tab={tab}
        onTabChange={setTab}
        onCompose={() => setShowCompose(true)}
        onLogout={handleLogout}
      />
      <main className=""flex-1 min-w-0"">
        <div className=""max-w-6xl mx-auto px-6 md:px-10 py-8"">
          <div className=""flex flex-wrap items-center justify-between gap-4 mb-7"">
            <div>
              <h1 className=""text-2xl font-bold text-void-900 tracking-tight capitalize"">{tab} emails</h1>
              <p className=""text-sm text-void-400 mt-0.5"">
                {tab === ""scheduled"" ? ""Campaigns queued for delivery"" : ""Delivered and failed sends""}
              </p>
            </div>
            <div className=""flex items-center gap-3"">
              <button
                onClick={() => setShowCompose(true)}
                className=""rounded-xl bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-void-950 shadow-glow""
              >
                + Compose
              </button>
            </div>
          </div>
          <div className=""mb-7"">
            <StatsBar />
          </div>
          <EmailTable rows={rows} loading={loading} mode={tab} />
        </div>
      </main>
      {showCompose && (
        <ComposeModal
          senders={senders}
          onClose={() => setShowCompose(false)}
          onScheduled={() => { setShowCompose(false); }}
        />
      )}
    </div>
  );
}

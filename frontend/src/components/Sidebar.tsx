import { User } from "../types";
import SlackConnect from "./SlackConnect";

type Tab = "scheduled" | "sent";

interface Props {
  user: User;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onCompose: () => void;
  onLogout: () => void;
}

const navItems: { key: Tab; label: string; icon: JSX.Element }[] = [
  {
    key: "scheduled",
    label: "Scheduled",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "sent",
    label: "Sent",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 4l16 8-16 8 4-8-4-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Sidebar({ user, tab, onTabChange, onCompose, onLogout }: Props) {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-void-950 text-white h-screen sticky top-0">
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gold-gradient flex items-center justify-center text-void-950 font-bold text-sm shadow-glow">
            R
          </div>
          <div>
            <div className="font-semibold tracking-tight leading-none">ReachInbox</div>
            <div className="eyebrow text-void-400 mt-1">Scheduler</div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient text-void-950 font-semibold text-sm py-2.5 shadow-glow hover:brightness-105 active:brightness-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Compose
        </button>
      </div>

      <nav className="mt-6 px-3 flex-1">
        <div className="eyebrow text-void-400 px-3 mb-2">Mailroom</div>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onTabChange(item.key)}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium mb-1 transition-colors ${
              tab === item.key
                ? "bg-white/10 text-white"
                : "text-void-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className={tab === item.key ? "text-gold-400" : ""}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 pb-3">
        <div className="eyebrow text-void-400 px-3 mb-2">Integrations</div>
        <div className="rounded-lg bg-white/5 px-3 py-2.5">
          <SlackConnect />
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full ring-2 ring-gold-500/40" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-void-400 truncate">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="text-void-400 hover:text-white transition-colors p-1.5"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

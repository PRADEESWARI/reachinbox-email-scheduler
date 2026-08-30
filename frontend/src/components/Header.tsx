import { User } from "../types";

interface Props {
  user: User;
  onLogout: () => void;
}

/** Small hand-drawn-style postmark seal - the page's recurring signature mark. */
function PostmarkSeal() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="15.5" stroke="#C4472C" strokeWidth="1.4" strokeDasharray="2.5 2.5" />
      <circle cx="17" cy="17" r="10.5" stroke="#C4472C" strokeWidth="1" />
      <text x="17" y="20" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="8.5" fill="#C4472C" fontWeight="600">
        RI
      </text>
    </svg>
  );
}

export default function Header({ user, onLogout }: Props) {
  return (
    <header
      className="relative border-b-2 border-postal-500 bg-ink-900 px-6 py-4 overflow-hidden"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 14px)",
      }}
    >
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PostmarkSeal />
          <div>
            <div className="font-semibold text-white leading-none tracking-tight">ReachInbox</div>
            <div className="eyebrow text-ink-100/50 mt-1">Dispatch &amp; Scheduling Desk</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full border-2 border-postal-500" />
          <div className="text-sm">
            <div className="font-medium text-white leading-tight">{user.name}</div>
            <div className="text-ink-100/50 text-xs font-mono">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="ml-2 rounded-sm border border-ink-100/30 px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-ink-100/80 hover:bg-white/5 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

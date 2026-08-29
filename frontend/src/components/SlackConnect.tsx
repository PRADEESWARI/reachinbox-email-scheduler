import { useEffect, useState } from "react";
import { api } from "../api/client";

interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  channelName: string | null;
}

/**
 * "Connect Slack" control - hits the backend's real OAuth authorize
 * redirect (GET /api/slack/oauth/start), which sends the user to Slack's
 * actual consent screen. Not a manually-pasted webhook URL.
 */
export default function SlackConnect() {
  const [status, setStatus] = useState<SlackStatus | null>(null);

  async function loadStatus() {
    const res = await api.get<SlackStatus>("/slack/status");
    setStatus(res.data);
  }

  useEffect(() => {
    loadStatus();
    // Re-check status if we just came back from the OAuth redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.get("slack")) {
      loadStatus();
      window.history.replaceState({}, "", "/");
    }
  }, []);

  function handleConnect() {
    window.location.href = "/api/slack/oauth/start";
  }

  async function handleDisconnect() {
    await api.post("/slack/disconnect");
    loadStatus();
  }

  if (!status) return null;

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      {status.connected ? (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-sent shrink-0" />
            <span className="text-void-200 truncate">
              Slack{status.channelName ? ` · #${status.channelName}` : " connected"}
            </span>
          </div>
          <button onClick={handleDisconnect} className="text-void-400 hover:text-white transition-colors shrink-0">
            ✕
          </button>
        </>
      ) : (
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 text-void-300 hover:text-white transition-colors w-full"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-void-400" />
          Connect Slack
        </button>
      )}
    </div>
  );
}

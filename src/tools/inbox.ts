import { getUnreadMessages, getAllMessages, getMessage, markAsRead, markAllAsRead, StoredMessage, MessageRef } from "../store.js";
import { syncFromPostbox } from "../sync.js";
import { loadIdentity } from "../identity.js";

function formatRefs(refsJson: string): string {
  try {
    const refs: MessageRef[] = JSON.parse(refsJson);
    if (!refs || refs.length === 0) return "";
    const lines = refs.map((r) => {
      const parts = Object.entries(r)
        .filter(([k, v]) => k !== "type" && v)
        .map(([k, v]) => `${k}: ${v}`);
      return `  [${r.type}] ${parts.join(", ")}`;
    });
    return `\n\nReferences:\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

function formatMessage(msg: StoredMessage, showBody: boolean): string {
  const date = new Date(msg.timestamp * 1000);
  const timeAgo = getTimeAgo(date);
  const readMark = msg.read ? "" : " [NEW]";
  const header = `${msg.from_name} (${timeAgo})${readMark}`;

  if (!showBody) {
    const preview = msg.body.length > 80 ? msg.body.slice(0, 80) + "..." : msg.body;
    const refCount = (() => { try { const r = JSON.parse(msg.refs); return r.length; } catch { return 0; } })();
    const refTag = refCount > 0 ? ` [${refCount} ref${refCount > 1 ? "s" : ""}]` : "";
    return `- ${header}${refTag}: ${preview}`;
  }
  return `From: ${msg.from_name}\nWhen: ${date.toLocaleString()}\nID: ${msg.id}\n\n${msg.body}${formatRefs(msg.refs)}`;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export async function inbox(): Promise<string> {
  const identity = loadIdentity();
  if (!identity) return "Not set up yet. Run setup first.";

  // Sync first
  await syncFromPostbox();

  const unread = getUnreadMessages();
  if (unread.length === 0) {
    return "No new messages.";
  }

  const lines = unread.map((m) => formatMessage(m, false));
  return `${unread.length} new message${unread.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}`;
}

export async function readMessage(id: string): Promise<string> {
  const msg = getMessage(id);
  if (!msg) return `Message "${id}" not found.`;
  markAsRead(id);
  return formatMessage(msg, true);
}

export async function readAll(): Promise<string> {
  markAllAsRead();
  return "All messages marked as read.";
}

export async function allMessages(limit = 20): Promise<string> {
  const msgs = getAllMessages(limit);
  if (msgs.length === 0) return "No messages yet.";
  const lines = msgs.map((m) => formatMessage(m, false));
  return `${msgs.length} message${msgs.length > 1 ? "s" : ""} (showing last ${limit}):\n\n${lines.join("\n")}`;
}

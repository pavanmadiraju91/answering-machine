import { getUnreadMessages, getAllMessages, getMessage, markAsRead, markAllAsRead, StoredMessage } from "../store.js";
import { syncFromPostbox } from "../sync.js";
import { loadIdentity } from "../identity.js";

function formatMessage(msg: StoredMessage, showBody: boolean): string {
  const date = new Date(msg.timestamp * 1000);
  const timeAgo = getTimeAgo(date);
  const readMark = msg.read ? "" : " [NEW]";
  const header = `${msg.from_name} (${timeAgo})${readMark}`;

  if (!showBody) {
    const preview = msg.body.length > 80 ? msg.body.slice(0, 80) + "..." : msg.body;
    return `- ${header}: ${preview}`;
  }
  return `**From:** ${msg.from_name}\n**When:** ${date.toLocaleString()}\n**ID:** ${msg.id}\n\n${msg.body}`;
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

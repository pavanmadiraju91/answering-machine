import Database from "better-sqlite3";
import { getDbPath } from "./identity.js";

let db: Database.Database | null = null;

export interface MessageRef {
  type: string;
  [key: string]: string | undefined;
}

export interface StoredMessage {
  id: string;
  from_name: string;
  from_key: string;
  timestamp: number;
  content_type: string;
  body: string;
  refs: string; // JSON array of MessageRef
  read: number;
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        from_name TEXT NOT NULL,
        from_key TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text/markdown',
        body TEXT NOT NULL,
        refs TEXT NOT NULL DEFAULT '[]',
        read INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
  return db;
}

export function storeMessage(msg: Omit<StoredMessage, "read">): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO messages (id, from_name, from_key, timestamp, content_type, body, refs, read)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);
  stmt.run(msg.id, msg.from_name, msg.from_key, msg.timestamp, msg.content_type, msg.body, msg.refs || "[]");
}

export function getUnreadMessages(): StoredMessage[] {
  const db = getDb();
  return db.prepare("SELECT * FROM messages WHERE read = 0 ORDER BY timestamp DESC").all() as StoredMessage[];
}

export function getAllMessages(limit = 50): StoredMessage[] {
  const db = getDb();
  return db.prepare("SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?").all(limit) as StoredMessage[];
}

export function getMessage(id: string): StoredMessage | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as StoredMessage) || null;
}

export function markAsRead(id: string): void {
  const db = getDb();
  db.prepare("UPDATE messages SET read = 1 WHERE id = ?").run(id);
}

export function markAllAsRead(): void {
  const db = getDb();
  db.prepare("UPDATE messages SET read = 1").run();
}

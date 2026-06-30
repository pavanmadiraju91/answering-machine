# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Answering Machine — an MCP server that enables async encrypted messaging between Claude Code users. Messages are encrypted client-side (NaCl box) and stored in a Cloudflare Worker postbox until recipients pull them.

Published as `answering-machine` on npm. Installed via `claude mcp add answering-machine -- npx answering-machine`.

## Commands

```bash
npm run build      # tsc → dist/
npm run dev        # tsx src/index.ts (runs MCP server locally on stdio)
npm start          # node dist/index.js
```

No test suite exists yet.

### Postbox (Cloudflare Worker)

```bash
cd postbox
npm install
wrangler dev       # local dev
wrangler deploy    # deploy to Cloudflare
```

## Architecture

Two independent packages in one repo:

1. **`src/`** — The MCP server (TypeScript, ESM). Runs as a stdio MCP server inside Claude Code.
2. **`postbox/`** — A Cloudflare Worker that acts as a blind relay (KV-backed). It stores encrypted blobs and deletes them on pickup or after 7 days.

### MCP Server flow

```
src/index.ts          — MCP tool registrations, background sync loop
src/tools/setup.ts    — Identity creation (keypair + invite code)
src/tools/contacts.ts — Add/remove/list contacts
src/tools/send.ts     — Encrypt message → POST to recipient's postbox
src/tools/inbox.ts    — Read messages from local SQLite

src/identity.ts       — Keypair + contacts storage (~/.config/answering-machine/)
src/crypto.ts         — NaCl box encrypt/decrypt, base58 key encoding
src/invite-code.ts    — Human-readable invite code generation/parsing
src/store.ts          — SQLite message store (better-sqlite3)
src/sync.ts           — Pull encrypted messages from postbox, decrypt, store locally
```

### Key design decisions

- Private keys never leave the user's machine. Encryption happens before network contact.
- Invite codes encode: display name, public key (base58), and postbox URL (base64url), separated by `::`.
- Messages use envelope format: metadata is plaintext, body+refs are encrypted together as `encrypted_payload` (v0.2 format).
- The postbox is intentionally dumb — it cannot read message content or correlate senders to recipients.
- Local state lives in `~/.config/answering-machine/` (identity.json, contacts.json, messages.db).
- Background sync runs every 5 minutes via setInterval after MCP server startup.

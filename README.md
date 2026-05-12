# Answering Machine

An async messaging tool for Claude Code users. Send messages to colleagues across timezones — they get them next time they open Claude Code.

No accounts. No SaaS. No daemon. Messages are end-to-end encrypted and held in a postbox until the recipient picks them up.

## Install

```bash
claude mcp add answering-machine -- npx @pavan_nandan/answering-machine
```

## Setup

```
You: "Set up my answering machine as Pavan Madiraju"

Claude: "Done. Your invite code is:
         Pavan-Madiraju-OPAL-PEARL-8625::FhBe...
         Share it with anyone you want to message with."
```

## Add a contact

Get their invite code (they share it once via Slack, email, whatever):

```
You: "Add Hans-Mueller-CLOUD-RIVER-0562::Ccv6..."

Claude: "Added Hans Mueller to your contacts."
```

## Send a message

```
You: "Send Hans: reviewed the API doc, looks good. One question about the auth section."

Claude: "Sent to Hans Mueller."
```

## Check messages

```
You: "Any messages?"

Claude: "2 new messages:
         - Hans Mueller (3 hours ago): 'Thanks, let's use JWTs...'
         - Sarah Chen (1 hour ago): 'PR is up for review'"
```

That's it. Messages arrive silently in the background. Ask when you're ready.

## How it works

```
You send a message
  → encrypted with recipient's public key (NaCl box)
  → stored in postbox (Cloudflare Worker + KV)
  → postbox can't read it (just encrypted bytes)
  → auto-deletes after 7 days if not picked up

Recipient opens Claude Code
  → MCP server syncs from postbox in background
  → decrypts locally
  → stores in local SQLite
  → ready when they ask "any messages?"
```

## Architecture

```
┌─────────────────────┐                    ┌─────────────────────┐
│  Your Claude Code   │                    │  Their Claude Code  │
│  + MCP server       │                    │  + MCP server       │
└─────────┬───────────┘                    └───────────┬─────────┘
          │                                            │
          │ encrypt + POST          GET + decrypt      │
          │                                            │
          ▼                                            ▼
     ┌──────────────────────────────────────────────────────┐
     │            Postbox (Cloudflare Worker)                │
     │                                                      │
     │  Holds encrypted blobs. Can't read them.             │
     │  Deletes after pickup or 7-day expiry.               │
     └──────────────────────────────────────────────────────┘
```

## Security

- **End-to-end encrypted**: NaCl box (X25519 + XSalsa20-Poly1305)
- **Postbox is blind**: sees only encrypted bytes, can't read content
- **No accounts**: identity is a local keypair, never leaves your machine
- **No tracking**: postbox doesn't know who sent what, only the recipient ID (a public key hash)

## Privacy

Your private key never leaves `~/.config/answering-machine/identity.json`. Messages are encrypted before they hit the network. The postbox operator (Cloudflare Worker) cannot read message content, sender identity, or correlate messages to real people.

## MCP Tools

| Tool | What it does |
|------|-------------|
| `setup` | Create identity with your display name |
| `invite` | Get your invite code to share |
| `add_contact` | Add someone using their invite code |
| `remove_contact` | Remove a contact |
| `contacts` | List all contacts |
| `send` | Send a message to a contact |
| `inbox` | Check for new messages |
| `read_message` | Read a specific message by ID |
| `mark_all_read` | Mark all messages as read |
| `all_messages` | Show all messages (read and unread) |
| `reset_identity` | Generate new identity (old contacts can't reach you) |

## Local storage

Everything lives in `~/.config/answering-machine/`:

```
identity.json   ← your keypair + name (never shared)
contacts.json   ← name → public key mapping
messages.db     ← SQLite inbox
```

Delete the folder to factory reset.

## Self-hosting the postbox

The default postbox is a Cloudflare Worker included in this repo (`postbox/`). To run your own:

```bash
cd postbox
npm install
wrangler kv namespace create "MAILBOX"
# update wrangler.toml with the namespace ID
wrangler deploy
```

Then tell users to set a custom postbox URL during setup (feature coming).

## Making the repo public

This repo is safe to make public. It contains:
- The MCP server source code (open source, MIT)
- The Cloudflare Worker source code (generic, no secrets)
- No private keys, no credentials, no sensitive data

The `wrangler.toml` has your KV namespace ID — this is not sensitive. Others can't write to your KV without your Cloudflare credentials.

## License

MIT

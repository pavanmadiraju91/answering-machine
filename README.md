# Answering Machine

Send messages between Claude Code users across timezones. Messages sit in an encrypted postbox until the recipient opens Claude Code and asks for them.

No accounts, no background processes. Your private key stays on your machine.

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

Get their invite code (they share it once, however they want):

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

Messages sync silently when the MCP server starts. You read them when you feel like it.

## How it works

```
You send a message
  → encrypted with recipient's public key (NaCl box)
  → stored in postbox (Cloudflare Worker + KV)
  → postbox can't read it (just encrypted bytes)
  → auto-deletes after 7 days if not picked up

Recipient opens Claude Code
  → MCP server pulls from postbox in background
  → decrypts locally
  → stores in local SQLite
  → shows up when they ask
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

Encryption is NaCl box (X25519 + XSalsa20-Poly1305). The postbox only sees encrypted bytes and a recipient ID (derived from a public key). It can't read content, identify senders, or correlate messages to real people.

Your private key lives in `~/.config/answering-machine/identity.json` and never leaves your machine. Messages are encrypted before they touch the network.

## MCP tools

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

The default postbox is a Cloudflare Worker in `postbox/`. To run your own:

```bash
cd postbox
npm install
wrangler kv namespace create "MAILBOX"
# update wrangler.toml with the namespace ID
wrangler deploy
```

Custom postbox URL support during setup is coming.

## Making the repo public

Safe to do. The repo has source code and a `wrangler.toml` with a KV namespace ID (not sensitive, nobody can write to it without your Cloudflare credentials). No private keys, no secrets.

## License

MIT

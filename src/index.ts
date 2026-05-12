#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { setup, invite, reset } from "./tools/setup.js";
import { addContactTool, removeContactTool, listContacts } from "./tools/contacts.js";
import { send } from "./tools/send.js";
import { inbox, readMessage, readAll, allMessages } from "./tools/inbox.js";
import { syncFromPostbox } from "./sync.js";
import { loadIdentity } from "./identity.js";

const server = new McpServer(
  { name: "answering-machine", version: "0.1.0" },
  {
    instructions:
      "An answering machine for async messaging between Claude Code users. " +
      "Users set up an identity, share invite codes, and exchange messages across timezones. " +
      "Messages are stored encrypted in a postbox and synced when the user opens Claude Code. " +
      "On first use, ask the user for their display name and run setup. " +
      "When the user asks 'any messages?' run inbox to check.",
  }
);

server.tool(
  "setup",
  "Set up your answering machine identity. Creates a keypair and invite code.",
  { name: z.string().describe("Your display name (e.g. 'Pavan Madiraju')") },
  async ({ name }) => ({
    content: [{ type: "text", text: await setup(name) }],
  })
);

server.tool(
  "invite",
  "Get your invite code to share with others.",
  {},
  async () => ({
    content: [{ type: "text", text: await invite() }],
  })
);

server.tool(
  "reset_identity",
  "Reset your identity and generate a new invite code. Old contacts won't be able to reach you.",
  { name: z.string().describe("Your new display name") },
  async ({ name }) => ({
    content: [{ type: "text", text: await reset(name) }],
  })
);

server.tool(
  "add_contact",
  "Add a contact using their invite code.",
  { code: z.string().describe("The full invite code from your contact") },
  async ({ code }) => ({
    content: [{ type: "text", text: await addContactTool(code) }],
  })
);

server.tool(
  "remove_contact",
  "Remove a contact by name.",
  { name: z.string().describe("Name of the contact to remove") },
  async ({ name }) => ({
    content: [{ type: "text", text: await removeContactTool(name) }],
  })
);

server.tool(
  "contacts",
  "List all your contacts.",
  {},
  async () => ({
    content: [{ type: "text", text: await listContacts() }],
  })
);

server.tool(
  "send",
  "Send a message to a contact.",
  {
    to: z.string().describe("Contact name (or part of their name)"),
    message: z.string().describe("The message to send (markdown supported)"),
    refs: z.array(z.record(z.string())).optional().describe(
      "Optional references to attach (e.g. Figma files, Confluence pages, Jira tickets, URLs). Each ref is an object with a 'type' field and any relevant keys like url, file_key, node_id, page_id, issue_key, label."
    ),
  },
  async ({ to, message, refs }) => ({
    content: [{ type: "text", text: await send(to, message, refs as any) }],
  })
);

server.tool(
  "inbox",
  "Check for new messages. Syncs from postbox first.",
  {},
  async () => ({
    content: [{ type: "text", text: await inbox() }],
  })
);

server.tool(
  "read_message",
  "Read a specific message by ID.",
  { id: z.string().describe("Message ID") },
  async ({ id }) => ({
    content: [{ type: "text", text: await readMessage(id) }],
  })
);

server.tool(
  "mark_all_read",
  "Mark all messages as read.",
  {},
  async () => ({
    content: [{ type: "text", text: await readAll() }],
  })
);

server.tool(
  "all_messages",
  "Show all messages (read and unread).",
  { limit: z.number().optional().describe("Max messages to show (default 20)") },
  async ({ limit }) => ({
    content: [{ type: "text", text: await allMessages(limit ?? 20) }],
  })
);

// Background sync on startup
async function startBackgroundSync() {
  const identity = loadIdentity();
  if (!identity) return;

  // Initial sync
  const count = await syncFromPostbox();
  if (count > 0) {
    console.error(`[answering-machine] Synced ${count} new message(s) on startup`);
  }

  // Sync every 5 minutes
  setInterval(async () => {
    try {
      await syncFromPostbox();
    } catch (e) {
      // Silent fail — will retry next interval
    }
  }, 5 * 60 * 1000);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[answering-machine] MCP server running on stdio");
  startBackgroundSync();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

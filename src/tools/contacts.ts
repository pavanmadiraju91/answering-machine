import { parseInviteCode } from "../invite-code.js";
import {
  addContact,
  removeContact as removeContactFn,
  loadContacts,
  findContact,
} from "../identity.js";
import { publicKeyToBase58 } from "../crypto.js";

export async function addContactTool(code: string): Promise<string> {
  try {
    const data = parseInviteCode(code);
    addContact({
      displayName: data.displayName,
      publicKey: publicKeyToBase58(data.publicKey),
      postboxUrl: data.postboxUrl,
    });
    return `Added "${data.displayName}" to your contacts.`;
  } catch (e: any) {
    return `Failed to add contact: ${e.message}`;
  }
}

export async function removeContactTool(name: string): Promise<string> {
  const removed = removeContactFn(name);
  if (removed) return `Removed "${name}" from contacts.`;
  return `Contact "${name}" not found.`;
}

export async function listContacts(): Promise<string> {
  const contacts = loadContacts();
  const entries = Object.values(contacts);
  if (entries.length === 0) return "No contacts yet. Add someone with their invite code.";
  const lines = entries.map((c) => `- ${c.displayName}`);
  return `Contacts (${entries.length}):\n${lines.join("\n")}`;
}

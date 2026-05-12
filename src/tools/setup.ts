import { createIdentity, hasIdentity, loadIdentity, getPublicKeyBytes } from "../identity.js";
import { generateInviteCode } from "../invite-code.js";
import { getPostboxUrl } from "../sync.js";

export async function setup(name: string): Promise<string> {
  if (hasIdentity()) {
    const existing = loadIdentity()!;
    return `Already set up as "${existing.displayName}". Use reset to change identity.`;
  }
  const identity = createIdentity(name);
  const inviteCode = generateInviteCode(
    identity.displayName,
    getPublicKeyBytes(identity),
    getPostboxUrl()
  );
  return `Identity created as "${identity.displayName}".\n\nYour invite code:\n${inviteCode}\n\nShare it with anyone you want to message with.`;
}

export async function invite(): Promise<string> {
  const identity = loadIdentity();
  if (!identity) return "Not set up yet. Run setup first.";
  const inviteCode = generateInviteCode(
    identity.displayName,
    getPublicKeyBytes(identity),
    getPostboxUrl()
  );
  return `Your invite code:\n\n${inviteCode}\n\nShare it with anyone you want to message with.`;
}

export async function reset(name: string): Promise<string> {
  const { deleteIdentity } = await import("../identity.js");
  deleteIdentity();
  return setup(name);
}

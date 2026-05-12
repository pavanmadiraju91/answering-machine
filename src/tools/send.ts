import { randomUUID } from "crypto";
import { loadIdentity, findContact, getSecretKey, getPublicKeyBytes } from "../identity.js";
import { encrypt, base58ToPublicKey } from "../crypto.js";
import { sendToPostbox } from "../sync.js";
import { MessageRef } from "../store.js";

export async function send(to: string, message: string, refs?: MessageRef[]): Promise<string> {
  const identity = loadIdentity();
  if (!identity) return "Not set up yet. Run setup first.";

  const contact = findContact(to);
  if (!contact) return `Contact "${to}" not found. Add them first with their invite code.`;

  const payload = JSON.stringify({
    body: message,
    refs: refs || [],
  });

  const envelope = {
    id: randomUUID(),
    from_name: identity.displayName,
    from_key: identity.publicKey,
    timestamp: Math.floor(Date.now() / 1000),
    content_type: "text/markdown",
    encrypted_payload: encrypt(
      payload,
      base58ToPublicKey(contact.publicKey),
      getSecretKey(identity)
    ),
  };

  const envelopeJson = JSON.stringify(envelope);
  const success = await sendToPostbox(
    contact.publicKey,
    contact.postboxUrl,
    envelopeJson
  );

  if (success) {
    const refSummary = refs && refs.length > 0
      ? ` (with ${refs.length} reference${refs.length > 1 ? "s" : ""})`
      : "";
    return `Sent to ${contact.displayName}${refSummary}.`;
  }
  return `Failed to send to ${contact.displayName}. Their postbox may be unreachable.`;
}

import { randomUUID } from "crypto";
import { loadIdentity, findContact, getSecretKey, getPublicKeyBytes } from "../identity.js";
import { encrypt, base58ToPublicKey } from "../crypto.js";
import { sendToPostbox } from "../sync.js";

export async function send(to: string, message: string): Promise<string> {
  const identity = loadIdentity();
  if (!identity) return "Not set up yet. Run setup first.";

  const contact = findContact(to);
  if (!contact) return `Contact "${to}" not found. Add them first with their invite code.`;

  const envelope = {
    id: randomUUID(),
    from_name: identity.displayName,
    from_key: identity.publicKey,
    timestamp: Math.floor(Date.now() / 1000),
    content_type: "text/markdown",
    body: encrypt(
      message,
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
    return `Sent to ${contact.displayName}.`;
  }
  return `Failed to send to ${contact.displayName}. Their postbox may be unreachable.`;
}

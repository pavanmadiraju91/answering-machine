import { loadIdentity, getSecretKey } from "./identity.js";
import { decrypt, base58ToPublicKey } from "./crypto.js";
import { storeMessage } from "./store.js";

const POSTBOX_URL = "https://answering-machine-postbox.pavannandanmadiraju.workers.dev";

interface PostboxMessage {
  id: string;
  data: string; // base64 encoded encrypted envelope
}

interface MessageEnvelope {
  id: string;
  from_name: string;
  from_key: string;
  timestamp: number;
  content_type: string;
  body: string; // encrypted
}

export function getPostboxUrl(): string {
  return POSTBOX_URL;
}

export async function syncFromPostbox(): Promise<number> {
  const identity = loadIdentity();
  if (!identity) return 0;

  const recipientId = identity.publicKey;
  const response = await fetch(`${POSTBOX_URL}/pick/${recipientId}`);
  if (!response.ok) return 0;

  const messages: PostboxMessage[] = await response.json();
  if (messages.length === 0) return 0;

  const secretKey = getSecretKey(identity);
  let count = 0;

  for (const msg of messages) {
    try {
      const envelopeJson = Buffer.from(msg.data, "base64").toString("utf-8");
      const envelope: MessageEnvelope = JSON.parse(envelopeJson);

      const senderPublicKey = base58ToPublicKey(envelope.from_key);
      const decryptedBody = decrypt(envelope.body, senderPublicKey, secretKey);

      storeMessage({
        id: envelope.id,
        from_name: envelope.from_name,
        from_key: envelope.from_key,
        timestamp: envelope.timestamp,
        content_type: envelope.content_type,
        body: decryptedBody,
      });

      // Confirm receipt — delete from postbox
      await fetch(`${POSTBOX_URL}/pick/${recipientId}/${msg.id}`, {
        method: "DELETE",
      });
      count++;
    } catch (e) {
      // Skip messages that can't be decrypted (not for us, corrupted, etc.)
      console.error(`Failed to process message ${msg.id}:`, e);
    }
  }

  return count;
}

export async function sendToPostbox(
  recipientPublicKeyB58: string,
  recipientPostboxUrl: string,
  encryptedEnvelope: string
): Promise<boolean> {
  const body = Buffer.from(encryptedEnvelope, "utf-8");
  const response = await fetch(`${recipientPostboxUrl}/drop/${recipientPublicKeyB58}`, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/octet-stream" },
  });
  return response.ok;
}

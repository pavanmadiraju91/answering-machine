export interface Env {
  MAILBOX: KVNamespace;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    // POST /drop/:recipient_id — store a message
    if (parts[0] === "drop" && parts[1] && request.method === "POST") {
      const recipientId = parts[1];
      const blob = await request.arrayBuffer();
      const msgId = crypto.randomUUID();
      const key = `${recipientId}||${msgId}`;
      await env.MAILBOX.put(key, blob, { expirationTtl: 604800 });
      return new Response(JSON.stringify({ id: msgId }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET /pick/:recipient_id — retrieve all messages
    if (parts[0] === "pick" && parts[1] && !parts[2] && request.method === "GET") {
      const recipientId = parts[1];
      const list = await env.MAILBOX.list({ prefix: `${recipientId}||` });
      const messages: { id: string; data: string }[] = [];
      for (const key of list.keys) {
        const blob = await env.MAILBOX.get(key.name, "arrayBuffer");
        if (blob) {
          const msgId = key.name.split("||")[1];
          messages.push({
            id: msgId,
            data: arrayBufferToBase64(blob),
          });
        }
      }
      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // DELETE /pick/:recipient_id/:msg_id — confirm receipt
    if (parts[0] === "pick" && parts[1] && parts[2] && request.method === "DELETE") {
      const recipientId = parts[1];
      const msgId = parts[2];
      await env.MAILBOX.delete(`${recipientId}||${msgId}`);
      return new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

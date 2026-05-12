import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import bs58 from "bs58";

const { encodeBase64, decodeBase64 } = naclUtil;

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

export function publicKeyToBase58(publicKey: Uint8Array): string {
  return bs58.encode(publicKey);
}

export function base58ToPublicKey(encoded: string): Uint8Array {
  return bs58.decode(encoded);
}

export function encrypt(
  message: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = new TextEncoder().encode(message);
  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientPublicKey,
    senderSecretKey
  );
  if (!encrypted) throw new Error("Encryption failed");
  const full = new Uint8Array(nonce.length + encrypted.length);
  full.set(nonce);
  full.set(encrypted, nonce.length);
  return encodeBase64(full);
}

export function decrypt(
  encryptedBase64: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string {
  const full = decodeBase64(encryptedBase64);
  const nonce = full.slice(0, nacl.box.nonceLength);
  const ciphertext = full.slice(nacl.box.nonceLength);
  const decrypted = nacl.box.open(
    ciphertext,
    nonce,
    senderPublicKey,
    recipientSecretKey
  );
  if (!decrypted) throw new Error("Decryption failed — wrong key or corrupted message");
  return new TextDecoder().decode(decrypted);
}

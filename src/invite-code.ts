import { randomBytes } from "crypto";
import { publicKeyToBase58, base58ToPublicKey } from "./crypto.js";

const WORDS = [
  "TIGER", "LAMP", "CLOUD", "RIVER", "WOLF", "DESK", "PIXEL", "STORM",
  "CORAL", "FLAME", "CEDAR", "SWIFT", "BLOOM", "FROST", "PEARL", "HAWK",
  "DUNE", "SPARK", "FERN", "BOLT", "JADE", "WAVE", "EMBER", "CRANE",
  "MOSS", "DRIFT", "OPAL", "FLINT", "VINE", "BLAZE", "HAZE", "CROW"
];

export interface InviteData {
  displayName: string;
  publicKey: Uint8Array;
  postboxUrl: string;
}

export function generateInviteCode(
  displayName: string,
  publicKey: Uint8Array,
  postboxUrl: string
): string {
  const keyBytes = publicKey;
  const word1 = WORDS[keyBytes[0] % WORDS.length];
  const word2 = WORDS[keyBytes[1] % WORDS.length];
  const num = ((keyBytes[2] << 8) | keyBytes[3]) % 10000;
  const numStr = num.toString().padStart(4, "0");
  const namePart = displayName.replace(/\s+/g, "-");
  const keyB58 = publicKeyToBase58(publicKey);
  const urlEncoded = Buffer.from(postboxUrl).toString("base64url");
  return `${namePart}-${word1}-${word2}-${numStr}::${keyB58}::${urlEncoded}`;
}

export function parseInviteCode(code: string): InviteData {
  const parts = code.split("::");
  if (parts.length !== 3) {
    throw new Error("Invalid invite code format");
  }
  const [humanPart, keyB58, urlEncoded] = parts;
  const humanParts = humanPart.split("-");
  // Last 3 parts are WORD-WORD-DIGITS, rest is the name
  const nameParts = humanParts.slice(0, -3);
  const displayName = nameParts.join(" ");
  const publicKey = base58ToPublicKey(keyB58);
  const postboxUrl = Buffer.from(urlEncoded, "base64url").toString();
  return { displayName, publicKey, postboxUrl };
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { generateKeyPair, publicKeyToBase58, base58ToPublicKey } from "./crypto.js";
import naclUtil from "tweetnacl-util";
const { encodeBase64, decodeBase64 } = naclUtil;

const CONFIG_DIR = join(homedir(), ".config", "answering-machine");

export interface Identity {
  displayName: string;
  publicKey: string; // base58
  secretKey: string; // base64
}

export interface Contact {
  displayName: string;
  publicKey: string; // base58
  postboxUrl: string;
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getIdentityPath(): string {
  return join(CONFIG_DIR, "identity.json");
}

export function getContactsPath(): string {
  return join(CONFIG_DIR, "contacts.json");
}

export function getDbPath(): string {
  return join(CONFIG_DIR, "messages.db");
}

export function hasIdentity(): boolean {
  return existsSync(getIdentityPath());
}

export function loadIdentity(): Identity | null {
  if (!hasIdentity()) return null;
  const data = readFileSync(getIdentityPath(), "utf-8");
  return JSON.parse(data);
}

export function createIdentity(displayName: string): Identity {
  ensureConfigDir();
  const keyPair = generateKeyPair();
  const identity: Identity = {
    displayName,
    publicKey: publicKeyToBase58(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
  writeFileSync(getIdentityPath(), JSON.stringify(identity, null, 2));
  return identity;
}

export function deleteIdentity(): void {
  const path = getIdentityPath();
  if (existsSync(path)) {
    const { unlinkSync } = require("fs");
    unlinkSync(path);
  }
}

export function loadContacts(): Record<string, Contact> {
  ensureConfigDir();
  const path = getContactsPath();
  if (!existsSync(path)) return {};
  const data = readFileSync(path, "utf-8");
  return JSON.parse(data);
}

export function saveContacts(contacts: Record<string, Contact>): void {
  ensureConfigDir();
  writeFileSync(getContactsPath(), JSON.stringify(contacts, null, 2));
}

export function addContact(contact: Contact): void {
  const contacts = loadContacts();
  const key = contact.displayName.toLowerCase();
  contacts[key] = contact;
  saveContacts(contacts);
}

export function removeContact(name: string): boolean {
  const contacts = loadContacts();
  const key = name.toLowerCase();
  if (contacts[key]) {
    delete contacts[key];
    saveContacts(contacts);
    return true;
  }
  return false;
}

export function findContact(name: string): Contact | null {
  const contacts = loadContacts();
  const key = name.toLowerCase();
  if (contacts[key]) return contacts[key];
  for (const [k, v] of Object.entries(contacts)) {
    if (v.displayName.toLowerCase().includes(key)) return v;
  }
  return null;
}

export function getSecretKey(identity: Identity): Uint8Array {
  return decodeBase64(identity.secretKey);
}

export function getPublicKeyBytes(identity: Identity): Uint8Array {
  return base58ToPublicKey(identity.publicKey);
}

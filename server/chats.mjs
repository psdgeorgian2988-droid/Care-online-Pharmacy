import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clipText, newMessageId, replyTo } from "../src/careChat.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, "data", "chats.json");

async function ensureFile() {
  await mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, `${JSON.stringify({ threads: [] }, null, 2)}\n`);
  }
}

async function readStore() {
  await ensureFile();
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return { threads: Array.isArray(parsed?.threads) ? parsed.threads : [] };
  } catch {
    return { threads: [] };
  }
}

async function writeStore(store) {
  await ensureFile();
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`);
}

function publicThread(thread) {
  if (!thread) return null;
  return {
    sessionId: thread.sessionId,
    name: thread.name || "",
    mobile: thread.mobile || "",
    needsStaff: Boolean(thread.needsStaff),
    unreadStaff: Boolean(thread.unreadStaff),
    updatedAt: thread.updatedAt,
    messages: Array.isArray(thread.messages) ? thread.messages : [],
  };
}

export async function getThread(sessionId) {
  const id = String(sessionId || "");
  if (!id) return null;
  const store = await readStore();
  return publicThread(store.threads.find((row) => row.sessionId === id) || null);
}

export async function listThreads() {
  const store = await readStore();
  return [...store.threads]
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .map(publicThread);
}

export async function appendCustomerMessage({ sessionId, text, name, mobile }) {
  const id = String(sessionId || "").slice(0, 80);
  const body = clipText(text, 500);
  if (!id || !body) return null;
  const store = await readStore();
  let thread = store.threads.find((row) => row.sessionId === id);
  if (!thread) {
    thread = {
      sessionId: id,
      name: clipText(name, 80),
      mobile: String(mobile || "").replace(/\D/g, "").slice(0, 10),
      needsStaff: false,
      unreadStaff: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    store.threads.unshift(thread);
  }
  if (name) thread.name = clipText(name, 80);
  if (mobile) thread.mobile = String(mobile).replace(/\D/g, "").slice(0, 10);
  if (!Array.isArray(thread.messages)) thread.messages = [];
  if (thread.messages.length > 80) thread.messages = thread.messages.slice(-60);

  const userMsg = {
    id: newMessageId(),
    from: "user",
    text: body,
    at: Date.now(),
  };
  const reply = replyTo(body);
  const botMsg = {
    id: newMessageId(),
    from: "bot",
    text: reply.text,
    at: Date.now(),
    links: reply.links || [],
  };
  thread.messages.push(userMsg, botMsg);
  if (reply.needsStaff) thread.needsStaff = true;
  thread.unreadStaff = true;
  thread.updatedAt = Date.now();
  await writeStore(store);
  return publicThread(thread);
}

export async function staffReply(sessionId, text) {
  const body = clipText(text, 500);
  const store = await readStore();
  const thread = store.threads.find((row) => row.sessionId === String(sessionId || ""));
  if (!thread || !body) return null;
  thread.messages = thread.messages || [];
  thread.messages.push({
    id: newMessageId(),
    from: "staff",
    text: body,
    at: Date.now(),
  });
  thread.needsStaff = false;
  thread.unreadStaff = false;
  thread.unreadCustomer = true;
  thread.updatedAt = Date.now();
  await writeStore(store);
  return publicThread(thread);
}

export async function markCustomerRead(sessionId) {
  const store = await readStore();
  const thread = store.threads.find((row) => row.sessionId === String(sessionId || ""));
  if (!thread) return null;
  thread.unreadCustomer = false;
  await writeStore(store);
  return publicThread(thread);
}

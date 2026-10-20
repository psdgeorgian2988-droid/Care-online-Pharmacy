import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function cursorKey() {
  return String(process.env.CURSOR_API_KEY || process.env.MEDIHOME_CURSOR_KEY || "").trim();
}

function cursorModel() {
  return process.env.CURSOR_AI_MODEL || process.env.MEDIHOME_CURSOR_MODEL || "composer-2.5";
}

export function cursorConfigured() {
  return Boolean(cursorKey());
}

export function normalizeImageMime(mime = "") {
  const raw = String(mime || "").toLowerCase().trim();
  if (raw === "image/jpg") return "image/jpeg";
  if (raw === "image/pjpeg") return "image/jpeg";
  if (raw.startsWith("image/")) return raw;
  return raw;
}

export function extractJsonText(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
}

async function jsonFromWorkspace(cwd) {
  try {
    const names = await readdir(cwd);
    for (const name of names) {
      if (!name.toLowerCase().endsWith(".json")) continue;
      const raw = await readFile(path.join(cwd, name), "utf8");
      const sliced = extractJsonText(raw);
      if (sliced.startsWith("{")) return sliced;
    }
  } catch {
    /* ignore */
  }
  return "";
}

async function jsonFromConversation(run) {
  try {
    const turns = await run.conversation?.();
    if (!Array.isArray(turns)) return "";
    const blobs = [];
    for (const turn of turns) {
      const text = turn?.text || turn?.message || turn?.result || "";
      if (text) blobs.push(String(text));
      if (Array.isArray(turn?.messages)) {
        for (const msg of turn.messages) {
          if (msg?.text) blobs.push(String(msg.text));
        }
      }
    }
    return extractJsonText(blobs.join("\n"));
  } catch {
    return "";
  }
}

async function collectAgentJson(run, result, cwd) {
  const fromResult = extractJsonText(result?.result);
  if (fromResult.startsWith("{")) return fromResult;
  const fromFiles = await jsonFromWorkspace(cwd);
  if (fromFiles.startsWith("{")) return fromFiles;
  const fromTurns = await jsonFromConversation(run);
  if (fromTurns.startsWith("{")) return fromTurns;
  return fromResult;
}

async function runCursorPrompt({ prompt, images } = {}) {
  const apiKey = cursorKey();
  if (!apiKey) {
    throw new Error(
      "CURSOR_API_KEY is not set. Create a user key at https://cursor.com/dashboard/integrations"
    );
  }

  const { Agent } = await import("@cursor/sdk");
  const cwd = await mkdtemp(path.join(os.tmpdir(), "medihome-rx-"));
  let agent;
  try {
    agent = await Agent.create({
      apiKey,
      model: { id: cursorModel() },
      name: "MediHome prescription reader",
      tools: [],
      local: {
        cwd,
        settingSources: [],
      },
    });

    const payload = images?.length ? { text: prompt, images } : prompt;
    const run = await agent.send(payload);
    const result = await run.wait();
    if (result.status !== "finished") {
      throw new Error(
        result.error?.message || "Cursor AI could not read this prescription."
      );
    }
    const text = await collectAgentJson(run, result, cwd);
    if (!text) {
      throw new Error("Cursor AI returned an empty prescription response.");
    }
    return { text, model: result.model?.id || cursorModel() };
  } finally {
    try {
      if (agent?.[Symbol.asyncDispose]) await agent[Symbol.asyncDispose]();
      else agent?.close?.();
    } catch {
      /* ignore dispose errors */
    }
    await rm(cwd, { recursive: true, force: true }).catch(() => {});
  }
}

export async function callCursorVision({
  mime,
  base64,
  fileName,
  systemPrompt,
  ocrHint = "",
} = {}) {
  if (!base64) {
    throw new Error("Prescription file data is missing.");
  }

  const ocrBlock = String(ocrHint || "").trim()
    ? `

A first-pass OCR draft follows. It is often wrong on handwriting. Use the IMAGE as the source of truth. Only keep an OCR word if the letters on the page support it. Never replace an unclear word with a more common medicine.

OCR DRAFT:
"""
${String(ocrHint).slice(0, 8000)}
"""`
    : "";

  const prompt = `${systemPrompt || ""}
${ocrBlock}

Digitize this prescription file named "${fileName || "prescription"}".
List EVERY medicine on the page with duration (how many days) and how many times a day it must be taken, plus EVERY lab/radiology test. Do not omit later lines.
Return ONLY valid JSON. Do not edit files.`.trim();

  const imageMime = normalizeImageMime(mime);
  const images = imageMime.startsWith("image/")
    ? [{ data: base64, mimeType: imageMime }]
    : undefined;

  return runCursorPrompt({ prompt, images });
}

export async function callCursorMedicalValidation({ prompt } = {}) {
  return runCursorPrompt({ prompt });
}

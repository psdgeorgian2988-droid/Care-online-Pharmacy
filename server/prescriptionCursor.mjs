import { mkdtemp, rm } from "node:fs/promises";
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

export async function callCursorVision({
  mime,
  base64,
  fileName,
  systemPrompt,
  ocrHint = "",
} = {}) {
  const apiKey = cursorKey();
  if (!apiKey) {
    throw new Error(
      "CURSOR_API_KEY is not set. Create a user key at https://cursor.com/dashboard/integrations"
    );
  }
  if (!base64) {
    throw new Error("Prescription file data is missing.");
  }

  const { Agent } = await import("@cursor/sdk");
  const cwd = await mkdtemp(path.join(os.tmpdir(), "medihome-rx-"));
  let agent;
  try {
    agent = await Agent.create({
      apiKey,
      model: { id: cursorModel() },
      name: "MediHome prescription reader",
      local: {
        cwd,
        settingSources: [],
      },
    });

    const ocrBlock = String(ocrHint || "").trim()
      ? `

A first-pass OCR draft follows. It is often wrong on handwriting. Use the IMAGE as the source of truth. Only keep an OCR word if the letters on the page support it. Never replace an unclear word with a more common medicine.

OCR DRAFT:
"""
${String(ocrHint).slice(0, 2500)}
"""`
      : "";

    const prompt = `${systemPrompt || ""}
${ocrBlock}

Digitize this prescription file named "${fileName || "prescription"}".
List every medicine with duration (how many days) and how many times a day it must be taken, plus any lab/radiology tests.
Return ONLY valid JSON. Do not edit files.`.trim();

    const images = mime.startsWith("image/")
      ? [{ data: base64, mimeType: mime }]
      : undefined;

    const run = await agent.send(images ? { text: prompt, images } : prompt);
    const result = await run.wait();
    if (result.status !== "finished") {
      throw new Error(
        result.error?.message || "Cursor AI could not read this prescription."
      );
    }
    const text = String(result.result || "").trim();
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

/**
 * ai.js
 * ======
 * CENTRALIZED GEMINI CLIENT INITIALIZATION
 *
 * SECURITY NOTE:
 *  The Gemini API key is read from a VITE_ env var, which means it is
 *  bundled into the client bundle and shipped to every visitor. It must be
 *  treated as a PUBLIC key. For production, prefer routing AI requests
 *  through a backend proxy (e.g. a Supabase Edge Function or serverless
 *  endpoint) so the real key never reaches the browser.
 *
 *  Local/development usage is fine with the key in .env, but do not rely on
 *  this for production-facing AI calls that consume paid quota.
 */

import { GoogleGenAI } from "@google/genai";

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

const isConfigured =
  Boolean(geminiApiKey) &&
  geminiApiKey !== "your_gemini_api_key_here" &&
  geminiApiKey !== "your_key_here";

/**
 * Lazy singleton GoogleGenAI client, or null when no API key is configured.
 * Components should check `getAiClient() !== null` before using it.
 */
let client = null;

export function getAiClient() {
  if (!isConfigured) return null;
  if (!client) client = new GoogleGenAI({ apiKey: geminiApiKey });
  return client;
}

/** True when a Gemini API key is present and usable. */
export function isAiConfigured() {
  return isConfigured;
}

if (isConfigured && import.meta.env.PROD) {
  console.warn(
    "[E-Kodak] A VITE_GEMINI_API_KEY is bundled into this build and is public. " +
    "For production, move AI calls behind a backend proxy."
  );
}

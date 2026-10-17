/**
 * ai.js
 * ======
 * CENTRALIZED HIGH-PERFORMANCE STUDIO AI INITIALIZATION
 *
 * Primary Engine:
 *  - Groq High-Speed Inference (qwen/qwen3.8-27b, openai/gpt-oss-20b, openai/gpt-oss-120b)
 *
 * Fallback Engine:
 *  - Google Gemini API (gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
 *
 * Features:
 *  - Full backward-compatible `.models.generateContent({ model, contents, config })`
 *  - Native sub-second Groq streaming/chat completions
 *  - Auto-retries and fallback between models on rate limits
 *  - Persona & portal awareness for studio assistant, dispatch, & notifications
 */

import { GoogleGenAI } from "@google/genai";

const groqApiKey = (import.meta.env.VITE_GROQ_API_KEY || "").trim();
const configuredGroqModel = (import.meta.env.VITE_GROQ_MODEL || "qwen/qwen3.8-27b").trim();

const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();

const isGroqValid =
  Boolean(groqApiKey) &&
  !groqApiKey.includes("your_") &&
  groqApiKey.startsWith("gsk_");

const isGeminiValid =
  Boolean(geminiApiKey) &&
  !geminiApiKey.includes("your_") &&
  geminiApiKey.length > 20;

export function isGroqConfigured() {
  return isGroqValid;
}

export function isGeminiConfigured() {
  return isGeminiValid;
}

/** True when either Groq or Gemini AI is ready to use. */
export function isAiConfigured() {
  return isGroqValid || isGeminiValid;
}

export function getActiveAiProvider() {
  if (isGroqValid) return "groq";
  if (isGeminiValid) return "gemini";
  return "offline";
}

// ── Native Groq API Integration ──────────────────────────────────────────────

const GROQ_CANDIDATE_MODELS = [
  configuredGroqModel,
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
];

/**
 * Call Groq OpenAI-compatible chat completion endpoint.
 */
export async function chatWithGroq({
  messages = [],
  systemInstruction = "",
  model = null,
  temperature = 0.6,
  maxTokens = 850,
  responseFormat = null,
}) {
  if (!isGroqValid) {
    throw new Error("Groq API key is not configured.");
  }

  // Format messages
  const formattedMessages = [];

  if (systemInstruction) {
    formattedMessages.push({
      role: "system",
      content:
        typeof systemInstruction === "string"
          ? systemInstruction
          : JSON.stringify(systemInstruction),
    });
  }

  for (const m of messages) {
    if (!m) continue;
    let role = m.role === "model" || m.role === "assistant" ? "assistant" : "user";
    if (m.role === "system") role = "system";

    let text = "";
    if (typeof m.content === "string") {
      text = m.content;
    } else if (typeof m.text === "string") {
      text = m.text;
    } else if (Array.isArray(m.parts)) {
      text = m.parts.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n");
    } else if (typeof m === "string") {
      text = m;
    }

    if (text.trim()) {
      formattedMessages.push({ role, content: text });
    }
  }

  const modelsToTry = [
    model && !model.toLowerCase().includes("gemini") ? model : configuredGroqModel,
    ...GROQ_CANDIDATE_MODELS,
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError = null;

  for (const candidateModel of modelsToTry) {
    try {
      const payload = {
        model: candidateModel,
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens,
      };

      if (responseFormat) {
        payload.response_format = responseFormat;
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${res.status} ${res.statusText}`;
        console.warn(`[Groq AI] Model ${candidateModel} failed: ${errMsg}`);
        lastError = new Error(errMsg);
        continue; // try next candidate model
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const text = choice?.message?.content || "";

      return {
        text,
        model: candidateModel,
        provider: "groq",
        raw: data,
      };
    } catch (err) {
      console.warn(`[Groq AI] Error requesting ${candidateModel}:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All Groq models failed to respond.");
}

// ── Gemini Fallback Client ───────────────────────────────────────────────────

let geminiClientInstance = null;
function getRawGeminiClient() {
  if (!isGeminiValid) return null;
  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({ apiKey: geminiApiKey });
  }
  return geminiClientInstance;
}

// ── Unified Universal AI Client ──────────────────────────────────────────────

/**
 * Universal Studio AI Client
 * Provides full drop-in compatibility with `@google/genai` calls:
 * `client.models.generateContent({ model, contents, config })`
 * while executing via Groq with sub-second speeds.
 */
class UniversalAiClient {
  constructor() {
    this.models = {
      generateContent: async ({ model, contents, config = {} }) => {
        // 1. Prepare contents into messages list
        let messages = [];

        if (typeof contents === "string") {
          messages.push({ role: "user", content: contents });
        } else if (Array.isArray(contents)) {
          messages = contents.map((c) => {
            if (typeof c === "string") return { role: "user", content: c };
            const role = c.role === "model" ? "assistant" : c.role || "user";
            let text = "";
            if (Array.isArray(c.parts)) {
              text = c.parts.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n");
            } else if (c.text) {
              text = c.text;
            } else if (c.content) {
              text = c.content;
            }
            return { role, content: text };
          });
        } else if (contents && typeof contents === "object") {
          messages.push(contents);
        }

        const systemInstruction = config.systemInstruction || "";

        // 2. Prioritize Groq if configured
        if (isGroqValid) {
          try {
            const groqRes = await chatWithGroq({
              messages,
              systemInstruction,
              model,
              temperature: config.temperature ?? 0.6,
              maxTokens: config.maxTokens ?? 850,
            });

            return {
              text: groqRes.text,
              provider: "groq",
              model: groqRes.model,
              response: {
                candidates: [
                  {
                    content: {
                      parts: [{ text: groqRes.text }],
                    },
                  },
                ],
              },
            };
          } catch (groqErr) {
            console.warn("[Universal AI] Groq request failed, evaluating fallback:", groqErr.message);
          }
        }

        // 3. Fallback to Gemini if configured
        if (isGeminiValid) {
          const rawGemini = getRawGeminiClient();
          if (rawGemini) {
            const geminiModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
            for (const gemModel of geminiModels) {
              try {
                const res = await rawGemini.models.generateContent({
                  model: gemModel,
                  contents,
                  config,
                });
                return {
                  text: res.text,
                  provider: "gemini",
                  model: gemModel,
                  response: res,
                };
              } catch (gemErr) {
                console.warn(`[Universal AI] Gemini ${gemModel} failed:`, gemErr.message);
              }
            }
          }
        }

        throw new Error("Unable to fulfill AI request with available providers.");
      },
    };
  }
}

const universalClient = new UniversalAiClient();

/**
 * Returns the unified AI client. Always available if any AI provider is valid.
 */
export function getAiClient() {
  if (!isAiConfigured()) return null;
  return universalClient;
}

export default universalClient;

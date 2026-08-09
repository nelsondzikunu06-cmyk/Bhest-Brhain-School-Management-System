import { createOpenAI } from "@ai-sdk/openai";

export const AI_MODEL = "openai/gpt-5.6-sol";

/** Server-only Lovable AI Gateway provider (OpenAI Responses API). */
export function createGateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured on this workspace.");
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const AI_PROVIDER_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
  },
} as const;

/** Extract the first JSON object/array found in a model response. */
export function parseJsonLoose<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, "```").trim();
  const fenced = cleaned.match(/```([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : cleaned).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  const slice = candidate.slice(start);
  try {
    return JSON.parse(slice) as T;
  } catch {
    // Try trimming to the last closing bracket.
    const lastObj = Math.max(slice.lastIndexOf("}"), slice.lastIndexOf("]"));
    if (lastObj === -1) return null;
    try {
      return JSON.parse(slice.slice(0, lastObj + 1)) as T;
    } catch {
      return null;
    }
  }
}

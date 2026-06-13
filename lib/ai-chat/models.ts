/**
 * Model registry — single source of truth for all model metadata.
 *
 * Imported by both client (`model-picker.tsx`) and server (`chat.service.ts`).
 * Provides model IDs, labels, badges, capabilities, and provider grouping.
 */
export type ModelCapabilities = {
  vision: boolean;
  files: boolean;
};

export type ModelInfo = {
  id: string;
  label: string;
  providerId?: string;
  badge?: string;
  capabilities: ModelCapabilities;
};

export type ProviderInfo = {
  id: string;
  label: string;
  models: ModelInfo[];
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    models: [
      {
        id: "deepseek/deepseek-v4-pro",
        label: "DeepSeek V4 Pro",
        badge: "NEW",
        capabilities: { vision: false, files: false },
      },
      {
        id: "deepseek/deepseek-v4-flash",
        label: "DeepSeek V4 Flash",
        badge: "NEW",
        capabilities: { vision: false, files: false },
      },
      {
        id: "deepseek/deepseek-v3.2",
        label: "DeepSeek V3.2",
        capabilities: { vision: false, files: false },
      },
      {
        id: "deepseek/deepseek-v3.2-thinking",
        label: "DeepSeek V3.2 Thinking",
        badge: "NEW",
        capabilities: { vision: false, files: false },
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      {
        id: "openai/gpt-4o",
        label: "GPT-4o",
        capabilities: { vision: true, files: false },
      },
      {
        id: "openai/gpt-5.5",
        label: "GPT-5.5",
        badge: "NEW",
        capabilities: { vision: true, files: true },
      },
      {
        id: "openai/gpt-5.5-pro",
        label: "GPT-5.5 Pro",
        badge: "NEW",
        capabilities: { vision: true, files: true },
      },
      {
        id: "openai/gpt-5.4-mini",
        label: "GPT-5.4 Mini",
        capabilities: { vision: true, files: true },
      },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      {
        id: "anthropic/claude-3-5-sonnet",
        label: "Claude 3.5 Sonnet",
        capabilities: { vision: true, files: false },
      },
      {
        id: "anthropic/claude-sonnet-4.6",
        label: "Claude Sonnet 4.6",
        badge: "NEW",
        capabilities: { vision: true, files: true },
      },
      {
        id: "anthropic/claude-opus-4.7",
        label: "Claude Opus 4.7",
        badge: "NEW",
        capabilities: { vision: true, files: true },
      },
      {
        id: "anthropic/claude-opus-4.8",
        label: "Claude Opus 4.8",
        badge: "NEW",
        capabilities: { vision: true, files: true },
      },
    ],
  },
  {
    id: "google",
    label: "Google",
    models: [
      {
        id: "google/gemini-1-5-pro",
        label: "Gemini 1.5 Pro",
        capabilities: { vision: true, files: true },
      },
      {
        id: "google/gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro",
        badge: "NEW",
        capabilities: { vision: true, files: true },
      },
      {
        id: "google/gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash-Lite",
        badge: "NEW",
        capabilities: { vision: true, files: true },
      },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    models: [
      {
        id: "mistral/mistral-small-4",
        label: "Mistral Small 4",
        badge: "NEW",
        capabilities: { vision: false, files: false },
      },
      {
        id: "mistral/mistral-large-3",
        label: "Mistral Large 3",
        capabilities: { vision: false, files: false },
      },
    ],
  },
  {
    id: "minimax",
    label: "Minimax",
    models: [
      {
        id: "minimax/minimax-m2.1-lightning",
        label: "Minimax M2.1 Lightning",
        capabilities: { vision: false, files: false },
      },
      {
        id: "minimax/minimax-m2",
        label: "Minimax M2",
        capabilities: { vision: false, files: false },
      },
      {
        id: "minimax/minimax-m2.1",
        label: "Minimax M2.1",
        capabilities: { vision: false, files: false },
      },
      {
        id: "minimax/minimax-m2.5-highspeed",
        label: "Minimax M2.5 Highspeed",
        capabilities: { vision: false, files: false },
      },
      {
        id: "minimax/minimax-m2.5",
        label: "Minimax M2.5",
        capabilities: { vision: false, files: false },
      },
      {
        id: "minimax/minimax-m2.7-highspeed",
        label: "Minimax M2.7 Highspeed",
        capabilities: { vision: false, files: false },
      },
      {
        id: "minimax/minimax-m2.7",
        label: "Minimax M2.7",
        capabilities: { vision: false, files: false },
      },
    ],
  },
  {
    id: "xiaomi",
    label: "Xiaomi",
    models: [
      {
        id: "xiaomi/mimo-v2.5",
        label: "MiMo V2.5",
        capabilities: { vision: true, files: true },
      },
      {
        id: "xiaomi/mimo-v2.5-pro",
        label: "MiMo V2.5 Pro",
        capabilities: { vision: true, files: true },
      },
      {
        id: "xiaomi/mimo-v2-pro",
        label: "MiMo V2 Pro",
        capabilities: { vision: false, files: false },
      },
      {
        id: "xiaomi/mimo-v2-flash",
        label: "MiMo V2 Flash",
        capabilities: { vision: false, files: false },
      },
    ],
  },
  {
    id: "alibaba",
    label: "Alibaba",
    models: [
      {
        id: "alibaba/qwen3.6-27b",
        label: "Qwen 3.6 27B",
        capabilities: { vision: true, files: true },
      },
      {
        id: "alibaba/qwen-3.6-max-preview",
        label: "Qwen 3.6 Max Preview",
        capabilities: { vision: false, files: true },
      },
      {
        id: "alibaba/qwen3.6-plus",
        label: "Qwen 3.6 Plus",
        capabilities: { vision: true, files: true },
      },
      {
        id: "alibaba/qwen3.5-flash",
        label: "Qwen 3.5 Flash",
        capabilities: { vision: true, files: true },
      },
      {
        id: "alibaba/qwen3.5-plus",
        label: "Qwen 3.5 Plus",
        capabilities: { vision: true, files: true },
      },
    ],
  },
  {
    id: "zai",
    label: "Z.ai",
    models: [
      {
        id: "zai/glm-5.1",
        label: "GLM 5.1",
        capabilities: { vision: false, files: false },
      },
      {
        id: "zai/glm-5v-turbo",
        label: "GLM 5V Turbo",
        capabilities: { vision: true, files: true },
      },
      {
        id: "zai/glm-5-turbo",
        label: "GLM 5 Turbo",
        capabilities: { vision: false, files: false },
      },
      {
        id: "zai/glm-5",
        label: "GLM 5",
        capabilities: { vision: false, files: false },
      },
    ],
  },
];

// ── Derived lookup maps (built once, used everywhere) ──

const FLAT_MODELS = PROVIDERS.flatMap((p) =>
  p.models.map((m) => ({ ...m, providerId: p.id })),
);

const CAPABILITIES_BY_ID: Record<string, ModelCapabilities> =
  Object.fromEntries(FLAT_MODELS.map((m) => [m.id, m.capabilities]));

const DEFAULT_CAPABILITIES: ModelCapabilities = { vision: false, files: false };

/** Look up capabilities for a model ID. Unknown models get the safe default. */
export function getModelCapabilities(
  modelId: string | null | undefined,
): ModelCapabilities {
  if (!modelId) return DEFAULT_CAPABILITIES;
  return CAPABILITIES_BY_ID[modelId] ?? DEFAULT_CAPABILITIES;
}

/** Flat list of all model IDs (useful for validation / iteration). */
export const ALL_MODEL_IDS = FLAT_MODELS.map((m) => m.id);

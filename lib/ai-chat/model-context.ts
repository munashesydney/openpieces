/**
 * Model context and capability registry.
 *
 * Provides model metadata (context limits, output limits, token ratios)
 * with AI Gateway fallback for dynamic discovery.
 */

const CONTEXT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ModelLimits {
  context: number; // context window in tokens
  output: number;  // max output tokens
}

interface CacheEntry {
  limits: ModelLimits;
  fetchedAt: number;
}

// In-memory cache for AI Gateway responses
const limitsCache = new Map<string, CacheEntry>();

// Known model limits for common models (fallback when Gateway unavailable)
// Context and output are in TOKENS (not chars)
const KNOWN_MODEL_LIMITS: Record<string, ModelLimits> = {
  "deepseek/deepseek-v3.2": { context: 128000, output: 65536 },
  "deepseek/deepseek-chat":  { context: 128000, output: 4096 },
  "deepseek/deepseek-coder": { context: 128000, output: 16384 },
  "anthropic/claude-3-5-sonnet": { context: 200000, output: 8192 },
  "anthropic/claude-3-5-haiku": { context: 200000, output: 8192 },
  "openai/gpt-4o":            { context: 128000, output: 16384 },
  "openai/gpt-4o-mini":        { context: 128000, output: 16384 },
  "openai/gpt-4-turbo":        { context: 128000, output: 4096 },
  "google/gemini-1.5-pro":     { context: 128000, output: 8192 },
  "google/gemini-1.5-flash":    { context: 128000, output: 8192 },
};

/**
 * Retrieve limits for a model, trying AI Gateway first then falling back
 * to the local registry.
 */
export async function getModelLimits(model: string): Promise<ModelLimits> {
  // Check memory cache first
  const cached = limitsCache.get(model);
  if (cached && Date.now() - cached.fetchedAt < CONTEXT_CACHE_TTL_MS) {
    return cached.limits;
  }

  // Try AI Gateway
  const gatewayLimits = await fetchFromGateway(model);
  if (gatewayLimits) {
    limitsCache.set(model, { limits: gatewayLimits, fetchedAt: Date.now() });
    return gatewayLimits;
  }

  // Fallback to known registry
  const known = KNOWN_MODEL_LIMITS[model];
  if (known) {
    return known;
  }

  // Safe default for unknown models
  console.warn(`[model-context] Unknown model: ${model}, using defaults`);
  return { context: 128000, output: 4096 };
}

async function fetchFromGateway(model: string): Promise<ModelLimits | null> {
  const [creator, modelName] = model.split("/");
  if (!creator || !modelName) return null;

  try {
    const response = await fetch(
      `https://ai-gateway.vercel.sh/v1/models/${creator}/${modelName}/endpoints`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
        },
      }
    );

    if (!response.ok) return null;

    const json = await response.json();
    const endpoint = json.data?.endpoints?.[0];
    if (!endpoint) return null;

    return {
      context: (endpoint.context_length as number) || 128000,
      output: (endpoint.output_limit as number) || 4096,
    };
  } catch {
    return null;
  }
}

/**
 * Token-to-character ratio for a given model.
 * Different tokenizers have different ratios (DeepSeek ~3.5, others ~4).
 */
export function getModelCharTokenRatio(model: string): number {
  if (model.startsWith("deepseek/")) return 3.5;
  return 4;
}

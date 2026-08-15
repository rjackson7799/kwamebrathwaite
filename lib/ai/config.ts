/**
 * Shared OpenAI model + pricing configuration.
 *
 * Extracted because GPT_MODEL and the COST_PER_1K_* constants were previously
 * duplicated as file-local values in description-generator.ts and
 * press-summarizer.ts, which meant "reuse the existing cost constants" was not
 * actually implementable from a third module.
 */

/** Model used for all structured-output generation in this codebase. */
export const GPT_MODEL = 'gpt-4o-2024-08-06'

// GPT-4o pricing: $2.50 / 1M input tokens, $10.00 / 1M output tokens.
export const COST_PER_1K_INPUT_TOKENS = 0.0025
export const COST_PER_1K_OUTPUT_TOKENS = 0.01

/** Round to 4dp, matching the numeric(10,4) columns these values land in. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

/**
 * Actual cost from observed token usage.
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  return round4(
    (inputTokens * COST_PER_1K_INPUT_TOKENS) / 1000 +
      (outputTokens * COST_PER_1K_OUTPUT_TOKENS) / 1000
  )
}

/**
 * Rough token count for a string, used only for pre-flight cost estimation.
 * ~4 characters per token is the standard GPT-family approximation; this is
 * deliberately not a real tokenizer, since the estimate only gates a
 * confirmation prompt and the hard character cap bounds the true ceiling.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Estimated cost of a parse before it runs.
 *
 * @param text            the raw input to be parsed
 * @param outputRatio     expected output tokens as a fraction of input.
 *                        Structured extraction returns roughly as much JSON as
 *                        it consumed prose, so 1.0 is a deliberately
 *                        conservative (over-)estimate.
 */
export function estimateCost(text: string, outputRatio = 1.0): number {
  const inputTokens = estimateTokens(text)
  return calculateCost(inputTokens, Math.ceil(inputTokens * outputRatio))
}

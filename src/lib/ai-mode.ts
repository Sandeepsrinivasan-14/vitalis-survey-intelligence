export type AiMode = 'live' | 'demo';

/** Live when a Gemini key is configured (and AI_MODE is not forced to demo). */
export function getAiMode(): AiMode {
  const forced = process.env.AI_MODE;
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
  if (forced === 'demo') return 'demo';
  if (forced === 'live') return 'live';
  return hasKey ? 'live' : 'demo';
}

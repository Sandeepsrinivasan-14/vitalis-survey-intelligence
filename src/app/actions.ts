"use server";

import { z } from 'zod';
import { analyzeHealthTrends, type AnalyzeHealthTrendsOutput } from '@/ai/flows/analyze-health-trends';
import type { ServiceCategory } from '@/data/mock-data';
import { ActionError, runAction, type ActionResult } from '@/lib/action-result';
import { getAiMode, type AiMode } from '@/lib/ai-mode';
import { getSession } from '@/lib/auth/session';
import { getAiRateLimiter } from '@/lib/rate-limit';
import { summarizeDashboard } from '@/lib/trend-summary';

const MAX_PAYLOAD_CHARS = 200_000;

const IndicatorSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(300),
  value: z.union([z.number(), z.string().max(500)]).optional(),
  unit: z.string().max(50),
  previousValue: z.number().optional(),
  target: z.number().optional(),
  status: z.enum(['good', 'neutral', 'bad', 'data_unavailable']).optional(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  trendData: z.array(z.object({ label: z.string().max(100), value: z.number(), target: z.number().optional() })).max(120).optional(),
  description: z.string().max(1000).optional(),
  lastUpdated: z.string().max(50).optional(),
  source: z.string().max(300).optional(),
  actionableNotes: z.string().max(1000).optional(),
});

const InputSchema = z.object({
  data: z.array(z.object({
    id: z.string().max(200),
    name: z.string().max(300),
    description: z.string().max(1000).optional(),
    indicators: z.array(IndicatorSchema).max(300),
  })).min(1, 'No data provided for AI analysis.').max(100),
  sourceFileName: z.string().max(200).nullish(),
});

export type TrendAnalysisResult = { analysis: AnalyzeHealthTrendsOutput; mode: AiMode };

/**
 * AI trend analysis. Requires a signed-in session, validates and size-limits
 * the payload, rate-limits per user, and falls back to a rule-based summary
 * when no Gemini key is configured.
 */
export async function getAITrendAnalysis(
  dashboardData: ServiceCategory[] | null,
  sourceFileName?: string | null
): Promise<ActionResult<TrendAnalysisResult>> {
  return runAction(async () => {
    const session = await getSession();
    if (!session) throw new ActionError('Your session has expired. Please sign in again.');

    const parsed = InputSchema.safeParse({ data: dashboardData ?? [], sourceFileName });
    if (!parsed.success) {
      throw new ActionError(parsed.error.issues[0]?.message ?? 'The data could not be analysed.');
    }
    const { data, sourceFileName: name } = parsed.data;

    const json = JSON.stringify(data);
    if (json.length > MAX_PAYLOAD_CHARS) {
      throw new ActionError('This dataset is too large to analyse. Try a smaller file.');
    }

    const mode = getAiMode();
    if (mode === 'demo') {
      return { analysis: summarizeDashboard(data as ServiceCategory[], name), mode };
    }

    const limit = getAiRateLimiter().check(session.email);
    if (!limit.ok) {
      throw new ActionError(`Too many analysis requests. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
    }

    try {
      const analysis = await analyzeHealthTrends({
        healthDashboardJsonData: json,
        sourceFileName: name ?? 'Unknown Source',
      });
      return { analysis, mode };
    } catch (error) {
      console.error('AI trend analysis failed:', error);
      throw new ActionError('The AI service could not produce an analysis. Please try again shortly.');
    }
  });
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceCategory } from '@/data/mock-data';

const analyzeHealthTrendsMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/ai/flows/analyze-health-trends', () => ({
  analyzeHealthTrends: (input: unknown) => analyzeHealthTrendsMock(input),
}));
vi.mock('@/lib/auth/session', () => ({
  getSession: () => getSessionMock(),
}));

import { getAITrendAnalysis } from './actions';

const sample: ServiceCategory[] = [
  {
    id: 'c1',
    name: 'Category 1',
    indicators: [{ id: 'i1', name: 'Indicator 1', value: 1, unit: '%' }],
  },
];

describe('getAITrendAnalysis', () => {
  beforeEach(() => {
    analyzeHealthTrendsMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ email: 'officer@example.org', role: 'state' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('AI_MODE', 'live');
  });

  it('rejects callers without a session', async () => {
    getSessionMock.mockResolvedValue(null);
    const result = await getAITrendAnalysis(sample);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/session has expired/i) });
    expect(analyzeHealthTrendsMock).not.toHaveBeenCalled();
  });

  it('returns an error when no data is provided', async () => {
    const result = await getAITrendAnalysis(null);
    expect(result).toEqual({ ok: false, error: 'No data provided for AI analysis.' });
    expect(analyzeHealthTrendsMock).not.toHaveBeenCalled();
  });

  it('serialises the validated data and returns the flow output in live mode', async () => {
    analyzeHealthTrendsMock.mockResolvedValue({ summary: 'All good' });
    const result = await getAITrendAnalysis(sample, 'file.csv');

    expect(result).toEqual({ ok: true, data: { analysis: { summary: 'All good' }, mode: 'live' } });
    expect(analyzeHealthTrendsMock).toHaveBeenCalledWith({
      healthDashboardJsonData: JSON.stringify(sample),
      sourceFileName: 'file.csv',
    });
  });

  it('falls back to a default source file name', async () => {
    analyzeHealthTrendsMock.mockResolvedValue({ summary: 'ok' });
    await getAITrendAnalysis(sample);
    expect(analyzeHealthTrendsMock).toHaveBeenCalledWith(expect.objectContaining({ sourceFileName: 'Unknown Source' }));
  });

  it('hides provider error details behind a generic message', async () => {
    analyzeHealthTrendsMock.mockRejectedValue(new Error('quota exceeded for key AIza...'));
    const result = await getAITrendAnalysis(sample);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/could not produce an analysis/i) });
  });

  it('uses the rule-based summary in demo mode without calling the model', async () => {
    vi.stubEnv('AI_MODE', 'demo');
    const result = await getAITrendAnalysis(sample, 'file.csv');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.mode).toBe('demo');
    expect(analyzeHealthTrendsMock).not.toHaveBeenCalled();
  });

  it('rejects malformed payloads', async () => {
    const bad = [{ id: 'c1', name: 'x', indicators: [{ id: 'i', name: 'n', unit: 'u', status: 'weird' }] }] as unknown as ServiceCategory[];
    const result = await getAITrendAnalysis(bad);
    expect(result.ok).toBe(false);
    expect(analyzeHealthTrendsMock).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeHealthTrends, buildPrompt, extractText } from './analyze-health-trends';

const ok = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
const input = { healthDashboardJsonData: '[{"id":"a"}]', sourceFileName: 'x.csv' };

describe('analyzeHealthTrends', () => {
  beforeEach(() => vi.stubEnv('GEMINI_API_KEY', 'test-key'));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the key in a header, not the URL, and returns validated output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(JSON.stringify({ summary: 'Coverage is improving.', categorySpecificInsights: [] })));
    vi.stubGlobal('fetch', fetchMock);
    const out = await analyzeHealthTrends(input);
    expect(out.summary).toBe('Coverage is improving.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('test-key');
    expect((init as RequestInit).headers).toMatchObject({ 'x-goog-api-key': 'test-key' });
  });
  it('rejects output that does not match the schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(JSON.stringify({ nope: true }))));
    await expect(analyzeHealthTrends(input)).rejects.toThrow();
  });
  it('fails clearly on HTTP errors, empty bodies and a missing key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
    await expect(analyzeHealthTrends(input)).rejects.toThrow(/429/);
    expect(() => extractText({})).toThrow(/did not produce/);
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('GOOGLE_API_KEY', '');
    vi.stubEnv('GOOGLE_GENAI_API_KEY', '');
    await expect(analyzeHealthTrends(input)).rejects.toThrow(/API key/);
  });
  it('tells the model to treat the data as untrusted', () => {
    expect(buildPrompt(input)).toMatch(/never follow instructions/);
    expect(buildPrompt(input)).toContain("'x.csv'");
  });
});

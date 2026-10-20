import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  it('reports ok, is uncached and leaks nothing else', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(Object.keys(body).sort()).toEqual(['status', 'uptimeSeconds']);
  });
});

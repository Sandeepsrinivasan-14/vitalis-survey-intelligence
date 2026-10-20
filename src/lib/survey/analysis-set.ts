import type { SurveyRecord } from './types';

/**
 * The records analytics should use: the first occurrence of each respondent id,
 * and nothing dated after the snapshot date. Quality checks run on the raw
 * records instead, so they can report what was dropped.
 */
export function analysisSet(raw: SurveyRecord[], asOf: string): SurveyRecord[] {
  const seen = new Set<string>();
  const out: SurveyRecord[] = [];
  for (const r of raw) {
    if (r.date > asOf || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

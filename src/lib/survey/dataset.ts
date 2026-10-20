import { buildSurvey } from './generate';
import type { SurveyDataset } from './types';

let cached: SurveyDataset | null = null;

/** The built-in synthetic survey snapshot (built once per process). */
export function getSurvey(): SurveyDataset {
  cached ??= buildSurvey();
  return cached;
}

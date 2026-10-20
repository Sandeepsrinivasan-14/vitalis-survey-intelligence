import { analysisSet } from './analysis-set';
import { getSurvey } from './dataset';
import { applyFilters, parseFilters, type SurveyFilters } from './filters';
import type { SurveyDataset, SurveyRecord } from './types';

export interface ExploreView {
  dataset: SurveyDataset;
  filters: SurveyFilters;
  /** Submitted records matching the filters (includes duplicates and bad rows). */
  raw: SurveyRecord[];
  /** De-duplicated, in-date records matching the filters. */
  clean: SurveyRecord[];
  /** Fieldwork views only honour state/district: enrolment is not sliced by gender or date. */
  scope: { state?: string; district?: string };
  scopeClean: SurveyRecord[];
  scopeTarget: number;
}

export function loadView(params: Record<string, string | string[] | undefined>): ExploreView {
  const dataset = getSurvey();
  const filters = parseFilters(params, dataset);
  const scope = { state: filters.state, district: filters.district };
  const cleanAll = analysisSet(dataset.records, dataset.asOf);
  return {
    dataset,
    filters,
    raw: applyFilters(dataset.records, filters),
    clean: applyFilters(cleanAll, filters),
    scope,
    scopeClean: applyFilters(cleanAll, scope),
    scopeTarget: dataset.facilities
      .filter((f) => (!scope.state || f.state === scope.state) && (!scope.district || f.district === scope.district))
      .reduce((sum, f) => sum + f.target, 0),
  };
}

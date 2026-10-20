import { isValidIsoDate } from './dates';
import { GENDERS, type Gender, type SurveyDataset, type SurveyRecord } from './types';

export interface SurveyFilters {
  state?: string;
  district?: string;
  gender?: Gender;
  from?: string;
  to?: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads filters from URL search params, silently dropping anything that is not valid for this dataset. */
export function parseFilters(params: SearchParams, dataset: Pick<SurveyDataset, 'states' | 'districts'>): SurveyFilters {
  const filters: SurveyFilters = {};
  const state = first(params.state);
  if (state && dataset.states.includes(state)) filters.state = state;

  const district = first(params.district);
  if (district && dataset.districts.some((d) => d.name === district && (!filters.state || d.state === filters.state))) {
    filters.district = district;
  }
  const gender = first(params.gender);
  if (gender && (GENDERS as readonly string[]).includes(gender)) filters.gender = gender as Gender;

  const from = first(params.from);
  const to = first(params.to);
  if (from && isValidIsoDate(from)) filters.from = from;
  if (to && isValidIsoDate(to)) filters.to = to;
  if (filters.from && filters.to && filters.from > filters.to) {
    [filters.from, filters.to] = [filters.to, filters.from];
  }
  return filters;
}

export function applyFilters(records: SurveyRecord[], f: SurveyFilters): SurveyRecord[] {
  return records.filter(
    (r) =>
      (!f.state || r.state === f.state) &&
      (!f.district || r.district === f.district) &&
      (!f.gender || r.gender === f.gender) &&
      (!f.from || r.date >= f.from) &&
      (!f.to || r.date <= f.to),
  );
}

/** Serialises filters (plus any extra params such as `tab`) into a query string without the leading `?`. */
export function filtersToQuery(f: SurveyFilters, extra: Record<string, string | undefined> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...extra, ...f })) if (v) q.set(k, v);
  return q.toString();
}

export function hasActiveFilters(f: SurveyFilters): boolean {
  return Object.values(f).some(Boolean);
}

import { createSeededRandom } from './random';
import { pct } from './stats';
import { GENDERS, type Facility, type Gender, type SurveyDataset, type SurveyRecord } from './types';

/**
 * Coverage = patients recorded ÷ the eligible population of the facility's
 * catchment. It answers "how much of the population have we actually reached?",
 * which is a different question from fieldwork progress ("are we on plan?").
 *
 * The register sizes below are synthetic. In a real deployment they would come
 * from the facility registers or a census extract; the maths stays the same.
 */

export type CoverageStatus = 'good' | 'moderate' | 'low' | 'no-population';

/** Coverage at or above these shares of the facility's eligible register. */
export const COVERAGE_THRESHOLDS = { good: 0.2, moderate: 0.12 } as const;

const GENDER_SHARE: Record<Gender, number> = { female: 0.505, male: 0.485, transgender: 0.01 };

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Population = Record<Gender, number>;

/** Eligible adult register of one facility, split by gender. Deterministic. */
export function facilityPopulation(facility: Pick<Facility, 'code' | 'target'>): Population {
  const rng = createSeededRandom(hash(`population:${facility.code}`));
  const total = Math.round(facility.target * (3.2 + rng() * 3.4));
  const trans = Math.max(1, Math.round(total * GENDER_SHARE.transgender));
  const female = Math.round((total - trans) * (GENDER_SHARE.female / (GENDER_SHARE.female + GENDER_SHARE.male)));
  return { female, male: total - trans - female, transgender: trans };
}

export function sumPopulation(items: Population[]): Population {
  return items.reduce<Population>(
    (acc, p) => ({ female: acc.female + p.female, male: acc.male + p.male, transgender: acc.transgender + p.transgender }),
    { female: 0, male: 0, transgender: 0 },
  );
}

export const totalOf = (p: Population) => p.female + p.male + p.transgender;

export interface CoverageFigures {
  population: number;
  recorded: number;
  /** Coverage in percent, or null when no population is known. */
  rate: number | null;
  /** True when more people were recorded than the register says exist, which points to a register or data problem. */
  overCovered: boolean;
  status: CoverageStatus;
  notReached: number;
}

export function coverageStatus(population: number, recorded: number): CoverageStatus {
  if (population <= 0) return 'no-population';
  const share = recorded / population;
  if (share >= COVERAGE_THRESHOLDS.good) return 'good';
  return share >= COVERAGE_THRESHOLDS.moderate ? 'moderate' : 'low';
}

export function coverageOf(population: number, recorded: number): CoverageFigures {
  return {
    population,
    recorded,
    rate: population > 0 ? pct(recorded, population) : null,
    overCovered: population > 0 && recorded > population,
    status: coverageStatus(population, recorded),
    notReached: Math.max(0, population - recorded),
  };
}

function inScope(f: Facility, scope: { state?: string; district?: string }) {
  return (!scope.state || f.state === scope.state) && (!scope.district || f.district === scope.district);
}

function countByGender(records: SurveyRecord[]): Population {
  const out: Population = { female: 0, male: 0, transgender: 0 };
  for (const r of records) out[r.gender] += 1;
  return out;
}

export interface GenderCoverage extends CoverageFigures {
  gender: Gender;
  /** Gender coverage as a share of overall coverage; under 0.8 means this group is under-represented. */
  relativeToOverall: number | null;
  underRepresented: boolean;
}

export interface UnitCoverage extends CoverageFigures {
  key: string;
  name: string;
  parent: string;
}

export interface CoverageReport {
  overall: CoverageFigures;
  byGender: GenderCoverage[];
  byDistrict: UnitCoverage[];
  byFacility: UnitCoverage[];
  /** Facilities, lowest coverage first, that fall below the "moderate" threshold. */
  lowCoverage: UnitCoverage[];
}

/** `records` must already be the cleaned analysis set for the scope (gender filter not applied). */
export function buildCoverage(
  records: SurveyRecord[],
  dataset: Pick<SurveyDataset, 'facilities'>,
  scope: { state?: string; district?: string },
): CoverageReport {
  const facilities = dataset.facilities.filter((f) => inScope(f, scope));
  const popByFacility = new Map(facilities.map((f) => [f.code, facilityPopulation(f)]));
  const recordedByFacility = new Map<string, number>();
  for (const r of records) recordedByFacility.set(r.facilityCode, (recordedByFacility.get(r.facilityCode) ?? 0) + 1);

  const population = sumPopulation([...popByFacility.values()]);
  const recordedByGender = countByGender(records.filter((r) => popByFacility.has(r.facilityCode)));
  const overall = coverageOf(totalOf(population), totalOf(recordedByGender));

  const byGender = GENDERS.map<GenderCoverage>((gender) => {
    const figures = coverageOf(population[gender], recordedByGender[gender]);
    const relative = figures.rate !== null && overall.rate ? figures.rate / overall.rate : null;
    return { gender, ...figures, relativeToOverall: relative, underRepresented: relative !== null && relative < 0.8 && population[gender] >= 30 };
  });

  const byFacility = facilities
    .map<UnitCoverage>((f) => ({
      key: f.code,
      name: f.name,
      parent: f.district,
      ...coverageOf(totalOf(popByFacility.get(f.code)!), recordedByFacility.get(f.code) ?? 0),
    }))
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));

  const districtNames = [...new Set(facilities.map((f) => f.district))];
  const byDistrict = districtNames
    .map<UnitCoverage>((name) => {
      const inDistrict = facilities.filter((f) => f.district === name);
      const pop = totalOf(sumPopulation(inDistrict.map((f) => popByFacility.get(f.code)!)));
      const rec = inDistrict.reduce((s, f) => s + (recordedByFacility.get(f.code) ?? 0), 0);
      return { key: name, name, parent: inDistrict[0].state, ...coverageOf(pop, rec) };
    })
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));

  return {
    overall,
    byGender,
    byDistrict,
    byFacility,
    lowCoverage: byFacility.filter((u) => u.status === 'low').slice(0, 8),
  };
}

export const COVERAGE_LABEL: Record<CoverageStatus, string> = {
  good: 'Well covered',
  moderate: 'Partly covered',
  low: 'Low coverage',
  'no-population': 'No population data',
};


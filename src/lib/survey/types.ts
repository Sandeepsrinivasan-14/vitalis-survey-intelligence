export const GENDERS = ['female', 'male', 'transgender'] as const;
export type Gender = (typeof GENDERS)[number];

export interface District {
  id: string;
  name: string;
  state: string;
}

/** A primary health centre (PHC) taking part in the survey. */
export interface Facility {
  id: string;
  code: string;
  name: string;
  district: string;
  state: string;
  /** Number of respondents this facility is expected to enrol. */
  target: number;
}

export interface Collector {
  id: number;
  label: string;
}

/**
 * One survey respondent. There is deliberately no name or any other direct
 * identifier: the survey model only keeps what the analytics need.
 * Numeric fields are nullable because missing values are a fact of fieldwork.
 */
export interface SurveyRecord {
  id: string;
  state: string;
  district: string;
  facilityCode: string;
  collectorId: number;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  gender: Gender;
  age: number | null;
  systolic: number | null;
  diastolic: number | null;
  /** Estimated daily salt intake in grams. */
  saltGrams: number | null;
  bmi: number | null;
  smoker: boolean | null;
}

export interface SurveyDataset {
  states: string[];
  districts: District[];
  facilities: Facility[];
  collectors: Collector[];
  records: SurveyRecord[];
  /** First and last planned day of fieldwork, and the "today" of this snapshot. */
  start: string;
  end: string;
  asOf: string;
}

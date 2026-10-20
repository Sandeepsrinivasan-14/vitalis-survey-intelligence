import { addDays, workingDays } from './dates';
import { clamp, createSeededRandom, normal, round } from './random';
import { GEOGRAPHY } from './geography';
import type { Collector, District, Facility, Gender, SurveyDataset, SurveyRecord } from './types';

export const SURVEY_START = '2026-03-02';
export const SURVEY_END = '2026-07-31';
export const SURVEY_AS_OF = '2026-06-30';

const FACILITIES_PER_DISTRICT = 6;
const TARGET_PER_FACILITY = 55;
const COLLECTOR_COUNT = 9;

/** How far each district (in listing order) is through its quota relative to the plan. */
const DISTRICT_PACE = [0.96, 0.9, 0.82, 1.0, 0.92, 0.58, 0.97, 0.84, 1.02, 0.7, 0.88, 0.94];
/** Districts whose residents report higher salt intake in the synthetic population. */
const SALT_HOTSPOTS = new Set([5, 9]);

/** Collector with last-digit preference when writing down blood pressure. */
export const DIGIT_PREFERENCE_COLLECTOR = 7;
/** Collector whose salt answers barely vary: a classic sign of invented data. */
export const LOW_VARIANCE_COLLECTOR = 4;

export function buildSurvey(seed = 20260630): SurveyDataset {
  const rng = createSeededRandom(seed);
  const plan = workingDays(SURVEY_START, SURVEY_END);
  const elapsed = plan.filter((d) => d <= SURVEY_AS_OF);

  const states = GEOGRAPHY.map((g) => g.name);
  const districts: District[] = [];
  const facilities: Facility[] = [];
  GEOGRAPHY.forEach((g) =>
    g.districts.forEach((name) => {
      const dIndex = districts.length;
      districts.push({ id: `${g.id}-${dIndex + 1}`, name, state: g.name });
      for (let f = 1; f <= FACILITIES_PER_DISTRICT; f++) {
        const code = `${g.id}${String(dIndex + 1).padStart(2, '0')}-${String(f).padStart(2, '0')}`;
        facilities.push({ id: code, code, name: `${name} PHC ${f}`, district: name, state: g.name, target: TARGET_PER_FACILITY });
      }
    }),
  );
  const collectors: Collector[] = Array.from({ length: COLLECTOR_COUNT }, (_, i) => ({
    id: i + 1,
    label: `Collector ${String(i + 1).padStart(2, '0')}`,
  }));

  const plannedFraction = elapsed.length / plan.length;
  const records: SurveyRecord[] = [];

  facilities.forEach((facility) => {
    const dIndex = districts.findIndex((d) => d.name === facility.district);
    const pace = DISTRICT_PACE[dIndex] ?? 0.9;
    const jitter = 0.85 + rng() * 0.3;
    const n = Math.round(facility.target * plannedFraction * pace * jitter);
    // A facility is served by two collectors assigned to its district.
    const team = [(dIndex % COLLECTOR_COUNT) + 1, ((dIndex + 4) % COLLECTOR_COUNT) + 1];

    for (let seq = 1; seq <= n; seq++) {
      const collectorId = team[rng() < 0.55 ? 0 : 1];
      const dayIndex = Math.floor(elapsed.length * (0.04 + 0.96 * rng() ** 0.9));
      const date = elapsed[Math.min(dayIndex, elapsed.length - 1)];

      const r = rng();
      const gender: Gender = r < 0.505 ? 'female' : r < 0.99 ? 'male' : 'transgender';
      const age = clamp(Math.round(normal(rng, 46, 15)), 18, 89);
      const bmi = round(clamp(normal(rng, 25.5 + (age - 45) * 0.03, 4.2), 15, 45), 1);
      const saltMean = 9.2 + (SALT_HOTSPOTS.has(dIndex) ? 2.2 : 0);
      let saltGrams = round(clamp(normal(rng, saltMean, 3.1), 1.5, 25), 1);
      if (collectorId === LOW_VARIANCE_COLLECTOR) saltGrams = round(clamp(normal(rng, 9.0, 0.6), 1.5, 25), 1);

      let systolic = Math.round(120 + (age - 30) * 0.6 + (bmi - 25) * 0.8 + (saltGrams - 9) * 1.2 + normal(rng, 0, 10));
      let diastolic = Math.round(77 + (age - 40) * 0.1 + (saltGrams - 9) * 0.6 + (bmi - 25) * 0.45 + normal(rng, 0, 7));
      systolic = clamp(systolic, 85, 215);
      diastolic = clamp(diastolic, 50, Math.min(125, systolic - 15));
      if (collectorId === DIGIT_PREFERENCE_COLLECTOR && rng() < 0.7) {
        systolic = Math.round(systolic / 10) * 10;
        diastolic = Math.round(diastolic / 10) * 10;
      }

      records.push({
        id: `${facility.code}-${String(seq).padStart(4, '0')}`,
        state: facility.state,
        district: facility.district,
        facilityCode: facility.code,
        collectorId,
        date,
        gender,
        age,
        systolic,
        diastolic,
        saltGrams,
        bmi,
        smoker: rng() < (gender === 'male' ? 0.28 : 0.06),
      });
    }
  });

  // --- Realistic fieldwork problems, injected so the quality tools have work to do.
  records.forEach((rec) => {
    const x = rng();
    if (x < 0.03) {
      rec.systolic = null;
      rec.diastolic = null;
    } else if (x < 0.07) {
      rec.saltGrams = null;
    } else if (x < 0.09) {
      rec.bmi = null;
    } else if (x < 0.094) {
      rec.age = null;
    } else if (x < 0.1) {
      rec.systolic = rng() < 0.5 ? 400 : 12; // keying slips
    } else if (x < 0.103) {
      rec.saltGrams = 99;
    } else if (x < 0.106) {
      rec.date = addDays(SURVEY_AS_OF, 3 + Math.floor(rng() * 20)); // future-dated
    }
  });
  const duplicates = records.filter(() => rng() < 0.022).map((r) => ({ ...r }));
  records.push(...duplicates);

  return { states, districts, facilities, collectors, records, start: SURVEY_START, end: SURVEY_END, asOf: SURVEY_AS_OF };
}

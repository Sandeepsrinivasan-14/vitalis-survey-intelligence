// src/data/mock-data.ts
//
// Landing-page survey figures are derived from the synthetic survey in lib/survey, so
// every number on the site comes from one source. All places and records are fictional.

import { analysisSet } from '@/lib/survey/analysis-set';
import { getSurvey } from '@/lib/survey/dataset';
import { genderCounts } from '@/lib/survey/stats';

export { createSeededRandom } from '@/lib/survey/random';

export interface HwcGenderCounts {
  male: number;
  female: number;
  transgender: number;
}

export interface HwcDistrictData extends HwcGenderCounts {
  id: string;
  name: string; // district name
  state: string;
}

export interface HwcPhcRecord {
  id: string;
  state: string;
  districtName: string;
  phcId: string; // facility code
  patientCount: number;
}

export interface HwcSummaryData {
  totalValidRecords: number;
  numStates: number;
  numDistricts: number;
  numPhcs: number;
  numDataCollectors: number;
  genderDistribution: HwcGenderCounts;
  lastUploadTimestamp: string; // "YYYY-MM-DD HH:MM:SS"
}

const survey = getSurvey();
const clean = analysisSet(survey.records, survey.asOf);

export const hwcSummaryMockData: HwcSummaryData = {
  totalValidRecords: clean.length,
  numStates: survey.states.length,
  numDistricts: survey.districts.length,
  numPhcs: survey.facilities.length,
  numDataCollectors: new Set(clean.map((r) => r.collectorId)).size,
  genderDistribution: genderCounts(clean),
  lastUploadTimestamp: `${survey.asOf} 18:00:00`,
};

export const hwcDistrictMockData: HwcDistrictData[] = survey.districts.map((d) => ({
  id: d.id,
  name: d.name,
  state: d.state,
  ...genderCounts(clean.filter((r) => r.district === d.name)),
}));

const perFacility = new Map<string, number>();
for (const r of clean) perFacility.set(r.facilityCode, (perFacility.get(r.facilityCode) ?? 0) + 1);

export const hwcPhcMockData: HwcPhcRecord[] = survey.facilities.map((f) => ({
  id: f.id,
  state: f.state,
  districtName: f.district,
  phcId: f.code,
  patientCount: perFacility.get(f.code) ?? 0,
}));


// --- Health indicator model ---------------------------------------------------
// Used by the role dashboards (uploaded files are mapped into this shape) and
// by the built-in sample dataset.

/** A single data point over time (monthly, quarterly, ...). */
export interface TimePointData {
  label: string; // e.g., 'Jan', 'Q1'
  value: number;
  target?: number;
}

export type IndicatorStatus = 'good' | 'neutral' | 'bad' | 'data_unavailable';
export type IndicatorTrend = 'up' | 'down' | 'stable';

export interface Indicator {
  id: string;
  name: string;
  value?: number | string; // numeric metrics, or text for system/IT data
  unit: string; // e.g., '%', 'minutes', 'per 100,000 live births'
  previousValue?: number;
  target?: number;
  status?: IndicatorStatus;
  trend?: IndicatorTrend;
  trendData?: TimePointData[];
  description?: string;
  lastUpdated?: string; // e.g., "2023-10-26"
  source?: string;
  actionableNotes?: string;
}

export interface ServiceCategory {
  id: string; // e.g., 'rmncha', 'ncds'
  name: string;
  description?: string;
  indicators: Indicator[];
}

/** Illustrative sample dataset ("Load sample data" on the role dashboards). */
export const healthDashboardData: ServiceCategory[] = [
  {
    id: 'rmncha',
    name: 'Maternal & Child Health',
    description: 'Reproductive, maternal, neonatal, child and adolescent health (RMNCH+A) indicators.',
    indicators: [
      {
        id: 'immunization_coverage_dpt3',
        name: 'DPT3 Immunization Coverage',
        value: 78,
        unit: '%',
        previousValue: 75,
        target: 90,
        status: 'neutral',
        trend: 'up',
        description: 'Children receiving the 3rd dose of DPT vaccine.',
        trendData: [
          { label: 'Q1', value: 72 },
          { label: 'Q2', value: 75 },
          { label: 'Q3', value: 76 },
          { label: 'Q4', value: 78 },
        ],
        lastUpdated: '2023-12-31',
        source: 'HMIS Portal',
      },
      {
        id: 'institutional_deliveries',
        name: 'Institutional Deliveries',
        value: 91,
        unit: '%',
        previousValue: 88,
        target: 95,
        status: 'good',
        trend: 'up',
        description: 'Births taking place in a health facility.',
        trendData: [
          { label: 'Q1', value: 85 },
          { label: 'Q2', value: 88 },
          { label: 'Q3', value: 90 },
          { label: 'Q4', value: 91 },
        ],
        lastUpdated: '2023-12-31',
      },
      {
        id: 'maternal_mortality_ratio',
        name: 'Maternal Mortality Ratio',
        value: 103,
        unit: 'per 100,000 live births',
        previousValue: 110,
        target: 70,
        status: 'bad',
        trend: 'down',
        description: 'Maternal deaths per 100,000 live births.',
        trendData: [
          { label: 'Q1', value: 118 },
          { label: 'Q2', value: 110 },
          { label: 'Q3', value: 106 },
          { label: 'Q4', value: 103 },
        ],
        lastUpdated: '2023-12-31',
      },
    ],
  },
  {
    id: 'ncds',
    name: 'Non-Communicable Diseases',
    description: 'Prevention, screening and control of NCDs.',
    indicators: [
      {
        id: 'hypertension_control_rate',
        name: 'Hypertension Control Rate',
        value: 45,
        unit: '%',
        previousValue: 42,
        target: 60,
        status: 'neutral',
        trend: 'up',
        description: 'Diagnosed hypertensive patients with controlled blood pressure.',
        trendData: [
          { label: 'Aug', value: 39 },
          { label: 'Sep', value: 41 },
          { label: 'Oct', value: 42 },
          { label: 'Nov', value: 45 },
        ],
        lastUpdated: '2023-11-30',
      },
      {
        id: 'diabetes_screening',
        name: 'Diabetes Screening Rate',
        value: 62,
        unit: '%',
        previousValue: 55,
        target: 70,
        status: 'good',
        trend: 'up',
        description: 'Adults over 30 screened for diabetes in the last year.',
        trendData: [
          { label: 'Aug', value: 50 },
          { label: 'Sep', value: 55 },
          { label: 'Oct', value: 58 },
          { label: 'Nov', value: 62 },
        ],
        lastUpdated: '2023-11-30',
      },
    ],
  },
  {
    id: 'facility_performance',
    name: 'Facility Performance',
    description: 'Operational throughput and service quality.',
    indicators: [
      {
        id: 'avg_wait_time',
        name: 'Average OPD Wait Time',
        value: 24,
        unit: 'min',
        previousValue: 22,
        target: 20,
        status: 'bad',
        trend: 'up',
        description: 'Time from registration to consultation.',
        trendData: [
          { label: 'Jan', value: 25 },
          { label: 'Feb', value: 28 },
          { label: 'Mar', value: 22 },
          { label: 'Apr', value: 24 },
        ],
        lastUpdated: '2023-12-31',
      },
      {
        id: 'patient_satisfaction',
        name: 'Patient Satisfaction',
        value: 90,
        unit: '%',
        previousValue: 86,
        target: 85,
        status: 'good',
        trend: 'up',
        description: 'Patients rating their visit as good or excellent.',
        trendData: [
          { label: 'Q1', value: 85 },
          { label: 'Q2', value: 88 },
          { label: 'Q3', value: 86 },
          { label: 'Q4', value: 90 },
        ],
        lastUpdated: '2023-12-31',
      },
    ],
  },
];

/** Illustrative system-health sample for the IT role's dashboard. */
export const systemSampleData: ServiceCategory[] = [
  {
    id: 'system-storage',
    name: 'Storage & backups',
    description: 'Database and backup health.',
    indicators: [
      { id: 'sys-backup', name: 'Last nightly backup', value: 'Online', unit: '', status: 'good', lastUpdated: '2024-03-31 02:00' },
      { id: 'sys-backup-size', name: 'Backup size', value: 18.4, unit: 'GB', previousValue: 17.9, status: 'neutral', trend: 'up' },
      {
        id: 'sys-disk',
        name: 'Disk usage',
        value: 71,
        unit: '%',
        target: 85,
        status: 'good',
        trend: 'up',
        trendData: [
          { label: 'Jan', value: 58 },
          { label: 'Feb', value: 63 },
          { label: 'Mar', value: 71 },
        ],
      },
    ],
  },
  {
    id: 'system-access',
    name: 'Users & access',
    description: 'Account activity and security events.',
    indicators: [
      { id: 'sys-users', name: 'Active users', value: 42, unit: 'users', previousValue: 39, status: 'good', trend: 'up' },
      { id: 'sys-failed', name: 'Failed sign-ins (24h)', value: 6, unit: 'attempts', previousValue: 3, target: 10, status: 'neutral', trend: 'up' },
    ],
  },
];

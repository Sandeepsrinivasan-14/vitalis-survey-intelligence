import type { Role } from '@/lib/auth/roles';
import type { UploadProfile } from './transform';

/** Spreadsheet vocabulary for each role's dashboard. */
export const UPLOAD_PROFILES: Record<Role, UploadProfile> = {
  facility: {
    idPrefix: 'fm',
    extraNameHeaders: ['service_provided', 'activity_name'],
    extraValueHeaders: ['number_reported'],
    extraDateHeaders: ['submission_date'],
    defaultCategory: (file) => `Facility data (${file})`,
    categoryDescription: (cat, file) => `Facility metrics for ${cat} from ${file}.`,
    wide: {
      contextHeaders: ['facility_id', 'department', 'service_point', 'reporting_period'],
      dateHeaders: ['iso_sdate', 'date', 'sdate', 'reporting_date', 'period_end_date'],
      columns: [
        { header: 'SPEC_RECEIVED_NB', unit: 'count', label: 'Specimens received' },
        { header: 'SPEC_PROCESSED_NB', unit: 'count', label: 'Specimens processed' },
        { header: 'ER_WAIT_TIME_AVG_MIN', unit: 'min', label: 'Average ER wait time' },
        { header: 'BED_OCCUPANCY_RATE', unit: '%', label: 'Bed occupancy rate' },
        { header: 'OPD_VISITS_TOTAL', unit: 'visits', label: 'Total OPD visits' },
        { header: 'Total_Cases', unit: 'cases', label: 'Total cases' },
        { header: 'Positivity_Rate', unit: '%', label: 'Positivity rate' },
      ],
      category: (file) => `Facility report (${file})`,
      description: (file) => `Facility metrics extracted from the wide-format file ${file}.`,
    },
  },
  district: {
    idPrefix: 'do',
    entityHeaders: ['facility_id', 'facility_name', 'phc_code'],
    defaultCategory: (file) => `District overview (${file})`,
    categoryDescription: (cat, file) => `District or facility-aggregated metrics for ${cat} from ${file}.`,
    wide: {
      contextHeaders: ['facility_id', 'location_code', 'block_name', 'phc_name'],
      dateHeaders: ['report_date', 'date', 'period'],
      columns: [
        { header: 'Immunization_Coverage_DPT3', unit: '%', label: 'DPT3 coverage' },
        { header: 'MMR_Reported', unit: 'ratio', label: 'Maternal mortality ratio' },
        { header: 'Avg_Wait_Time_OPD', unit: 'min', label: 'Average OPD wait time' },
        { header: 'NCD_Screening_Rate', unit: '%', label: 'NCD screening rate' },
      ],
      category: (file) => `District comparison (${file})`,
      description: (file) => `Comparative metrics across facilities in the district from ${file}.`,
    },
  },
  state: {
    idPrefix: 'sa',
    extraNameHeaders: ['state_level_indicator'],
    extraValueHeaders: ['state_aggregate_value'],
    entityHeaders: ['district_name', 'district', 'region_name'],
    extraDateHeaders: ['reporting_month_year'],
    extraCategoryHeaders: ['state_program', 'health_service_area'],
    defaultCategory: (file) => `State overview (${file})`,
    categoryDescription: (cat, file) => `State-level metrics for ${cat} from ${file}. May include district breakdowns.`,
    wide: {
      contextHeaders: ['district_name', 'region', 'program_name'],
      dateHeaders: ['reporting_year', 'quarter', 'month_year'],
      columns: [
        { header: 'State_MMR_Value', unit: 'ratio', label: 'State MMR' },
        { header: 'State_IMR_Value', unit: 'ratio', label: 'State IMR' },
        { header: 'Overall_Immunization_Coverage', unit: '%', label: 'State immunization coverage' },
        { header: 'NCD_Program_Budget_Utilization', unit: '%', label: 'NCD budget utilisation' },
      ],
      category: (file) => `State report (${file})`,
      description: (file) => `State-level metrics extracted from the wide-format file ${file}.`,
    },
  },
  admin: {
    idPrefix: 'wm',
    extraNameHeaders: ['parameter_name', 'config_key', 'setting', 'event_type'],
    extraValueHeaders: ['current_status'],
    extraCategoryHeaders: ['module', 'system_area', 'component'],
    extraDateHeaders: ['timestamp', 'last_checked', 'event_time', 'log_date'],
    allowTextValues: true,
    defaultCategory: (file) => `System data (${file})`,
    categoryDescription: (cat, file) => `Technical parameters and status metrics for ${cat} from ${file}.`,
  },
};

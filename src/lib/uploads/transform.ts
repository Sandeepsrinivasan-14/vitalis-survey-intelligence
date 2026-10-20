import type { Indicator, IndicatorStatus, IndicatorTrend, ServiceCategory } from '@/data/mock-data';
import type { SheetData } from '@/types/sheet';

/**
 * Maps an uploaded spreadsheet (first row = headers) into service categories.
 *
 * Two layouts are understood:
 *  - long: one indicator per row (an indicator-name column plus a value column);
 *  - wide: one row per location/date with a column per known indicator.
 * Headers are matched case-insensitively with spaces/hyphens treated as
 * underscores, so "Previous Value", "previous-value" and "previous_value" are
 * the same column. Roles tune the vocabulary through `UploadProfile`.
 */

export interface WideColumn {
  /** Header as it appears in the file (matched after normalisation). */
  header: string;
  unit: string;
  label: string;
}

export interface UploadProfile {
  /** Prefix that keeps generated ids unique between roles. */
  idPrefix: string;
  /** Extra header synonyms on top of the shared vocabulary. */
  extraNameHeaders?: string[];
  extraValueHeaders?: string[];
  extraCategoryHeaders?: string[];
  extraDateHeaders?: string[];
  /** Column naming the facility/district whose row it is; appended to the indicator name. */
  entityHeaders?: string[];
  /** Keep non-numeric values (e.g. "Online") instead of marking them unavailable. */
  allowTextValues?: boolean;
  defaultCategory: (fileName: string) => string;
  categoryDescription: (category: string, fileName: string) => string;
  wide?: {
    contextHeaders: string[];
    dateHeaders: string[];
    columns: WideColumn[];
    category: (fileName: string) => string;
    description: (fileName: string) => string;
  };
}

const NAME_HEADERS = ['indicator_name', 'indicator', 'metric_name', 'metric', 'name', 'kpi_name'];
const VALUE_HEADERS = ['value', 'current_value', 'metric_value', 'data', 'actual', 'count', 'aggregated_value'];
const UNIT_HEADERS = ['unit', 'units', 'measure_unit'];
const TARGET_HEADERS = ['target', 'goal', 'planned_value'];
const PREVIOUS_HEADERS = ['previous_value', 'previous', 'last_value', 'last_period_value'];
const STATUS_HEADERS = ['status', 'condition', 'indicator_status', 'performance_level'];
const TREND_HEADERS = ['trend', 'direction', 'change_direction'];
const DESCRIPTION_HEADERS = ['description', 'notes', 'details'];
const DATE_HEADERS = ['last_updated', 'date', 'updated_on', 'reporting_date', 'update_date'];
const CATEGORY_HEADERS = ['category', 'service_area', 'health_category', 'program_area', 'program'];

const STATUS_ALIASES: Record<string, IndicatorStatus> = {
  good: 'good',
  target_met: 'good',
  validated: 'good',
  neutral: 'neutral',
  pending_validation: 'neutral',
  underperforming: 'neutral',
  bad: 'bad',
  critical: 'bad',
  rejected: 'bad',
  data_unavailable: 'data_unavailable',
};

const TREND_ALIASES: Record<string, IndicatorTrend> = {
  up: 'up',
  significant_increase: 'up',
  down: 'down',
  significant_decrease: 'down',
  stable: 'stable',
};

export function normalizeHeader(header: unknown): string {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

const slug = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '');
const isBlank = (cell: unknown) => cell === null || cell === undefined || String(cell).trim() === '';
const text = (cell: unknown) => String(cell ?? '').trim();

function parseNumber(cell: unknown): number | undefined {
  if (isBlank(cell)) return undefined;
  const n = Number.parseFloat(String(cell).replace(/,/g, ''));
  return Number.isNaN(n) ? undefined : n;
}

export function transformSheet(sheet: SheetData, fileName: string, profile: UploadProfile): ServiceCategory[] {
  if (!sheet || sheet.length < 2) return [];
  const headers = sheet[0].map(normalizeHeader);
  const rows = sheet.slice(1).filter((row) => row && !row.every(isBlank));
  const find = (...variants: (string[] | undefined)[]) => {
    const wanted = variants.flatMap((v) => v ?? []).map(normalizeHeader);
    return headers.findIndex((h) => wanted.includes(h));
  };

  const nameIdx = find(NAME_HEADERS, profile.extraNameHeaders);
  const valueIdx = find(VALUE_HEADERS, profile.extraValueHeaders);

  if (nameIdx !== -1 && valueIdx !== -1) {
    const unitIdx = find(UNIT_HEADERS);
    const targetIdx = find(TARGET_HEADERS);
    const previousIdx = find(PREVIOUS_HEADERS);
    const statusIdx = find(STATUS_HEADERS);
    const trendIdx = find(TREND_HEADERS);
    const descriptionIdx = find(DESCRIPTION_HEADERS);
    const dateIdx = find(DATE_HEADERS, profile.extraDateHeaders);
    const categoryIdx = find(CATEGORY_HEADERS, profile.extraCategoryHeaders);
    const entityIdx = find(profile.entityHeaders);

    const byCategory = new Map<string, Indicator[]>();
    rows.forEach((row, i) => {
      let name = text(row[nameIdx]);
      if (!name) return;
      if (entityIdx !== -1 && !isBlank(row[entityIdx])) name = `${name} (${text(row[entityIdx])})`;

      const indicator: Indicator = {
        id: `${profile.idPrefix}-${slug(fileName)}-row-${i}`,
        name,
        unit: unitIdx !== -1 ? text(row[unitIdx]) : '',
      };
      const raw = row[valueIdx];
      const numeric = parseNumber(raw);
      if (numeric !== undefined) indicator.value = numeric;
      else if (profile.allowTextValues && !isBlank(raw)) indicator.value = text(raw);
      else indicator.status = 'data_unavailable';

      const target = targetIdx !== -1 ? parseNumber(row[targetIdx]) : undefined;
      if (target !== undefined) indicator.target = target;
      const previous = previousIdx !== -1 ? parseNumber(row[previousIdx]) : undefined;
      if (previous !== undefined) indicator.previousValue = previous;
      if (descriptionIdx !== -1 && !isBlank(row[descriptionIdx])) indicator.description = text(row[descriptionIdx]);
      if (dateIdx !== -1 && !isBlank(row[dateIdx])) indicator.lastUpdated = text(row[dateIdx]);

      const status = statusIdx !== -1 ? STATUS_ALIASES[normalizeHeader(row[statusIdx])] : undefined;
      if (status) indicator.status = status;
      else if (!indicator.status && typeof indicator.value === 'string') indicator.status = 'neutral';
      const trend = trendIdx !== -1 ? TREND_ALIASES[normalizeHeader(row[trendIdx])] : undefined;
      if (trend) indicator.trend = trend;

      const category = (categoryIdx !== -1 && text(row[categoryIdx])) || profile.defaultCategory(fileName);
      byCategory.set(category, [...(byCategory.get(category) ?? []), indicator]);
    });

    if (byCategory.size > 0) {
      return Array.from(byCategory, ([name, indicators]) => ({
        id: `${profile.idPrefix}-cat-${slug(name)}-${slug(fileName)}`,
        name,
        description: profile.categoryDescription(name, fileName),
        indicators,
      }));
    }
  }

  const wide = profile.wide;
  if (wide) {
    const contextIdx = find(wide.contextHeaders);
    const dateIdx = find(wide.dateHeaders);
    const columns = wide.columns
      .map((column) => ({ ...column, index: headers.indexOf(normalizeHeader(column.header)) }))
      .filter((column) => column.index !== -1);

    if (columns.length > 0) {
      const indicators: Indicator[] = [];
      rows.forEach((row, i) => {
        const context = contextIdx !== -1 && !isBlank(row[contextIdx]) ? text(row[contextIdx]) : '';
        const date = dateIdx !== -1 && !isBlank(row[dateIdx]) ? text(row[dateIdx]) : '';
        for (const column of columns) {
          const raw = row[column.index];
          const value = parseNumber(raw);
          // A non-empty, non-numeric cell is bad data for a numeric metric: skip it.
          if (value === undefined && !isBlank(raw)) continue;
          const suffix = [context, date && `(${date})`].filter(Boolean).join(' ');
          const indicator: Indicator = {
            id: `${profile.idPrefix}-wide-${slug(fileName)}-${i}-${slug(column.header)}`,
            name: suffix ? `${column.label} - ${suffix}` : column.label,
            unit: column.unit,
            status: value === undefined ? 'data_unavailable' : 'neutral',
          };
          if (value !== undefined) indicator.value = value;
          if (date) indicator.lastUpdated = date;
          indicators.push(indicator);
        }
      });
      if (indicators.length > 0) {
        return [
          {
            id: `${profile.idPrefix}-cat-wide-${slug(fileName)}`,
            name: wide.category(fileName),
            description: wide.description(fileName),
            indicators,
          },
        ];
      }
    }
  }

  return [];
}

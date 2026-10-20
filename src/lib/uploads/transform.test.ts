import { describe, expect, it } from 'vitest';
import { UPLOAD_PROFILES } from './profiles';
import { normalizeHeader, transformSheet } from './transform';
import type { SheetData } from '@/types/sheet';

const facility = UPLOAD_PROFILES.facility;

describe('normalizeHeader', () => {
  it('treats case, spaces and hyphens as equivalent', () => {
    expect(normalizeHeader(' Previous Value ')).toBe('previous_value');
    expect(normalizeHeader('previous-value')).toBe('previous_value');
    expect(normalizeHeader(null)).toBe('');
  });
});

describe('transformSheet (long format)', () => {
  const sheet: SheetData = [
    ['Category', 'Indicator Name', 'Value', 'Unit', 'Target', 'Previous Value', 'Status', 'Trend', 'Date', 'Notes'],
    ['Maternal', 'ANC visits', '1,200', 'visits', 1500, 1100, 'Good', 'up', '2024-01-31', 'On track'],
    ['Maternal', 'Home births', 'n/a', '%', '', '', '', '', '', ''],
    ['Child', 'DPT3', 78, '%', 90, 75, 'Target Met', 'Significant Increase', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Child', '', 5, '', '', '', '', '', '', ''],
  ];

  it('groups indicators by category and ignores empty rows', () => {
    const result = transformSheet(sheet, 'survey.csv', facility);
    expect(result.map((c) => c.name)).toEqual(['Maternal', 'Child']);
    expect(result[0].indicators).toHaveLength(2);
    expect(result[1].indicators).toHaveLength(1);
  });

  it('parses numbers, targets, statuses and trends', () => {
    const [maternal, child] = transformSheet(sheet, 'survey.csv', facility);
    expect(maternal.indicators[0]).toMatchObject({
      name: 'ANC visits',
      value: 1200,
      target: 1500,
      previousValue: 1100,
      status: 'good',
      trend: 'up',
      lastUpdated: '2024-01-31',
      description: 'On track',
    });
    expect(child.indicators[0]).toMatchObject({ status: 'good', trend: 'up' });
  });

  it('marks non-numeric values as unavailable for clinical roles', () => {
    const [maternal] = transformSheet(sheet, 'survey.csv', facility);
    expect(maternal.indicators[1].status).toBe('data_unavailable');
    expect(maternal.indicators[1].value).toBeUndefined();
  });

  it('uses the default category when none is given and generates unique ids', () => {
    const result = transformSheet(
      [
        ['indicator', 'value'],
        ['A', 1],
        ['B', 2],
      ],
      'my file.csv',
      facility,
    );
    expect(result[0].name).toBe('Facility data (my file.csv)');
    const ids = result[0].indicators.map((i) => i.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('appends the entity column (facility or district) to the indicator name', () => {
    const result = transformSheet(
      [
        ['Indicator', 'Value', 'Facility_ID'],
        ['Deliveries', 10, 'PHC-1'],
      ],
      'd.csv',
      UPLOAD_PROFILES.district,
    );
    expect(result[0].indicators[0].name).toBe('Deliveries (PHC-1)');
  });

  it('accepts role-specific vocabulary', () => {
    const result = transformSheet(
      [
        ['state_level_indicator', 'state_aggregate_value', 'district_name'],
        ['IMR', 28, 'North'],
      ],
      's.csv',
      UPLOAD_PROFILES.state,
    );
    expect(result[0].indicators[0]).toMatchObject({ name: 'IMR (North)', value: 28 });
  });

  it('keeps textual values for the IT role', () => {
    const result = transformSheet(
      [
        ['parameter_name', 'value', 'module'],
        ['Database', 'Online', 'Storage'],
        ['Backups', 7, 'Storage'],
      ],
      'sys.csv',
      UPLOAD_PROFILES.admin,
    );
    expect(result[0].name).toBe('Storage');
    expect(result[0].indicators[0]).toMatchObject({ value: 'Online', status: 'neutral' });
    expect(result[0].indicators[1].value).toBe(7);
  });
});

describe('transformSheet (wide format)', () => {
  const sheet: SheetData = [
    ['Facility_ID', 'Date', 'ER_WAIT_TIME_AVG_MIN', 'BED_OCCUPANCY_RATE'],
    ['F1', '2024-01-01', 24, 'oops'],
    ['F1', '2024-01-02', '', 80],
  ];

  it('expands one indicator per known column and row', () => {
    const [category] = transformSheet(sheet, 'wide.csv', facility);
    expect(category.name).toBe('Facility report (wide.csv)');
    const names = category.indicators.map((i) => i.name);
    expect(names).toContain('Average ER wait time - F1 (2024-01-01)');
    // 'oops' is non-numeric and skipped; the empty cell becomes data_unavailable.
    expect(names).not.toContain('Bed occupancy rate - F1 (2024-01-01)');
    const missing = category.indicators.find((i) => i.name.includes('(2024-01-02)') && i.unit === 'min');
    expect(missing?.status).toBe('data_unavailable');
  });
});

describe('transformSheet (unrecognised input)', () => {
  it('returns no categories for empty or unknown layouts', () => {
    expect(transformSheet([], 'x.csv', facility)).toEqual([]);
    expect(transformSheet([['only header']], 'x.csv', facility)).toEqual([]);
    expect(
      transformSheet(
        [
          ['foo', 'bar'],
          [1, 2],
        ],
        'x.csv',
        facility,
      ),
    ).toEqual([]);
  });
});

import { mean, pct, saltOf, sd } from './stats';
import type { Collector, SurveyRecord } from './types';

export type CollectorFlag = 'digit-preference' | 'low-variance' | 'high-throughput';

export const FLAG_LABELS: Record<CollectorFlag, string> = {
  'digit-preference': 'Rounds BP readings',
  'low-variance': 'Salt answers barely vary',
  'high-throughput': 'Unusually fast pace',
};

export interface CollectorRow {
  collectorId: number;
  label: string;
  records: number;
  activeDays: number;
  perDay: number;
  /** Share of systolic readings ending in 0 (about 10% is expected from honest measurement). */
  digitZeroShare: number;
  saltSd: number | null;
  flags: CollectorFlag[];
}

/**
 * Per-collector fieldwork and data-integrity signals. These are prompts for a
 * supervisor to look closer, not proof of misconduct.
 */
export function collectorStats(records: SurveyRecord[], collectors: Collector[]): CollectorRow[] {
  const byCollector = new Map<number, SurveyRecord[]>();
  for (const r of records) (byCollector.get(r.collectorId) ?? byCollector.set(r.collectorId, []).get(r.collectorId)!).push(r);

  const overallSaltSd = sd(records.map(saltOf).filter((v): v is number => v !== null));

  const rows = collectors
    .filter((c) => byCollector.has(c.id))
    .map((c) => {
      const rows = byCollector.get(c.id)!;
      const days = new Set(rows.map((r) => r.date)).size;
      const sys = rows.map((r) => r.systolic).filter((v): v is number => v !== null);
      const salts = rows.map(saltOf).filter((v): v is number => v !== null);
      return {
        collectorId: c.id,
        label: c.label,
        records: rows.length,
        activeDays: days,
        perDay: days ? Math.round((rows.length / days) * 10) / 10 : 0,
        digitZeroShare: pct(sys.filter((v) => v % 10 === 0).length, sys.length),
        saltSd: salts.length >= 2 ? sd(salts) : null,
        flags: [] as CollectorFlag[],
        _n: { sys: sys.length, salt: salts.length },
      };
    });

  const rates = rows.map((r) => r.perDay);
  const rateMean = mean(rates) ?? 0;
  const rateSd = sd(rates) ?? 0;

  return rows
    .map(({ _n, ...row }) => {
      const flags: CollectorFlag[] = [];
      if (_n.sys >= 30 && row.digitZeroShare >= 30) flags.push('digit-preference');
      if (_n.salt >= 30 && overallSaltSd && row.saltSd !== null && row.saltSd < overallSaltSd * 0.45) flags.push('low-variance');
      if (rateSd > 0 && (row.perDay - rateMean) / rateSd > 1.8) flags.push('high-throughput');
      return { ...row, flags };
    })
    .sort((a, b) => b.records - a.records);
}

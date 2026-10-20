/** Minimal ISO-date helpers. Everything is UTC so results never depend on the machine's time zone. */

const DAY_MS = 86_400_000;

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
}

export function diffDays(fromIso: string, toIsoDate: string): number {
  return Math.round((toDate(toIsoDate).getTime() - toDate(fromIso).getTime()) / DAY_MS);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = toDate(value);
  return !Number.isNaN(d.getTime()) && toIso(d) === value;
}

/** Field teams work Monday to Saturday. */
export function workingDays(startIso: string, endIso: string): string[] {
  const days: string[] = [];
  for (let d = startIso; d <= endIso; d = addDays(d, 1)) {
    if (toDate(d).getUTCDay() !== 0) days.push(d);
  }
  return days;
}

export function formatDate(iso: string): string {
  return toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

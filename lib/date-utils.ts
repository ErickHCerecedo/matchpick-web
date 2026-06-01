import type { RoundWithMatches, Match } from '@/types';

export type DateEntry = { match: Match; roundName: string };

export function groupByDate(rounds: RoundWithMatches[]): Map<string, DateEntry[]> {
  const byDate = new Map<string, DateEntry[]>();
  for (const r of rounds) {
    for (const m of r.matches) {
      const key = m.scheduled_at?.slice(0, 10) ?? 'sin-fecha';
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push({ match: m, roundName: r.round.name });
    }
  }
  return new Map([...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLabel(dateKey: string) {
  const d = parseDateKey(dateKey);
  return {
    weekday: d.toLocaleDateString('es-MX', { weekday: 'short' }),
    day: d.getDate(),
    month: d.toLocaleDateString('es-MX', { month: 'short' }),
  };
}

export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

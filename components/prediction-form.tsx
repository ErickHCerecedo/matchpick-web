'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MatchCard } from './match-card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { groupByDate, parseDateKey, todayKey } from '@/lib/date-utils';
import type { Match, RoundWithMatches, Prediction } from '@/types';
import { Save, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';

interface Props {
  quinielaSlug: string;
  rounds: RoundWithMatches[];
  initialPredictions: Record<number, Prediction>;
}

// ── helpers ────────────────────────────────────────────────────────────────

function firstOpenDate(rounds: RoundWithMatches[], predictions: Record<number, Prediction>): string | null {
  // First date that has open, unpredicted matches
  const byDate = groupByDate(rounds);
  for (const [dateKey, entries] of byDate) {
    const hasUnpredicted = entries.some(
      (e) => e.match.is_prediction_open && predictions[e.match.id]?.home_score === undefined
    );
    if (hasUnpredicted) return dateKey;
  }
  // Fall back to any date with open matches
  for (const [dateKey, entries] of byDate) {
    if (entries.some((e) => e.match.is_prediction_open)) return dateKey;
  }
  // Fall back to first date overall
  return byDate.keys().next().value ?? null;
}

// ── component ──────────────────────────────────────────────────────────────

export function PredictionForm({ quinielaSlug, rounds, initialPredictions }: Props) {
  const [predictions, setPredictions] =
    useState<Record<number, Prediction>>(initialPredictions);
  const [saving, setSaving] = useState(false);

  const matchesByDate = useMemo(() => groupByDate(rounds), [rounds]);
  const sortedDateKeys = useMemo(() => [...matchesByDate.keys()], [matchesByDate]);

  const [activeDateKey, setActiveDateKey] = useState<string | null>(() =>
    firstOpenDate(rounds, initialPredictions)
  );
  const activeDateRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeDateKey]);

  // Global progress
  const { totalPredicted, totalPredictable } = useMemo(() => {
    let predicted = 0;
    let predictable = 0;
    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.is_prediction_open) {
          predictable++;
          if (predictions[m.id]?.home_score !== undefined) predicted++;
        }
      }
    }
    return { totalPredicted: predicted, totalPredictable: predictable };
  }, [rounds, predictions]);

  const progressPct =
    totalPredictable > 0 ? Math.round((totalPredicted / totalPredictable) * 100) : 0;

  // Per-date stats for the date strip
  const dateStats = useMemo(() => {
    const stats = new Map<string, { openCount: number; predictedCount: number }>();
    for (const [dateKey, entries] of matchesByDate) {
      let openCount = 0;
      let predictedCount = 0;
      for (const { match } of entries) {
        if (match.is_prediction_open) {
          openCount++;
          if (predictions[match.id]?.home_score !== undefined) predictedCount++;
        }
      }
      stats.set(dateKey, { openCount, predictedCount });
    }
    return stats;
  }, [matchesByDate, predictions]);

  const handleChange = useCallback(
    (matchId: number, home: number, away: number) => {
      setPredictions((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], match_id: matchId, home_score: home, away_score: away },
      }));
    },
    []
  );

  const handleSave = async () => {
    const toSave = Object.values(predictions).filter(
      (p) => p.home_score !== undefined && p.away_score !== undefined
    );
    if (toSave.length === 0) {
      toast.error('No hay predicciones para guardar');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ data: { saved: number; errors: unknown[] } }>(
        `/quinielas/${quinielaSlug}/predictions`,
        {
          predictions: toSave.map((p) => ({
            match_id: p.match_id,
            home_score: p.home_score,
            away_score: p.away_score,
          })),
        }
      );
      toast.success(`${res.data.saved} predicciones guardadas`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Matches for active date, grouped by round name
  const activeDateMatchGroups = useMemo(() => {
    if (!activeDateKey) return [];
    const entries = matchesByDate.get(activeDateKey) ?? [];
    const grouped = new Map<string, Match[]>();
    for (const e of entries) {
      if (!grouped.has(e.roundName)) grouped.set(e.roundName, []);
      grouped.get(e.roundName)!.push(e.match);
    }
    return [...grouped.entries()];
  }, [matchesByDate, activeDateKey]);

  // Count only predictions that are new or changed vs what came from the server
  const pendingCount = useMemo(() => {
    return Object.entries(predictions).filter(([matchId, p]) => {
      if (p.home_score === undefined || p.away_score === undefined) return false;
      const orig = initialPredictions[Number(matchId)];
      if (!orig || orig.home_score === undefined) return true;
      return orig.home_score !== p.home_score || orig.away_score !== p.away_score;
    }).length;
  }, [predictions, initialPredictions]);

  // Missing predictions on the active date
  const missingOnActiveDate = useMemo(() => {
    if (!activeDateKey) return 0;
    const entries = matchesByDate.get(activeDateKey) ?? [];
    return entries.filter(
      (e) => e.match.is_prediction_open && predictions[e.match.id]?.home_score === undefined
    ).length;
  }, [matchesByDate, activeDateKey, predictions]);

  if (rounds.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-12">
        El calendario de partidos aún no está disponible.
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* ── Progress header ────────────────────────────────────────────── */}
      {totalPredictable > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Mis pronósticos</span>
            <span className="text-xs font-semibold text-white">
              {totalPredicted}
              <span className="text-slate-500 font-normal"> / {totalPredictable}</span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full transition-colors',
                progressPct === 100 ? 'bg-emerald-500' : 'bg-emerald-500/70'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          {progressPct === 100 && (
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ¡Completaste todos los pronósticos disponibles!
            </p>
          )}
        </div>
      )}

      {/* ── Date strip ─────────────────────────────────────────────────── */}
      {sortedDateKeys.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-0.5 px-0.5">
          {sortedDateKeys.map((dateKey) => {
            const d = parseDateKey(dateKey);
            const stat = dateStats.get(dateKey)!;
            const isActive = activeDateKey === dateKey;
            const isComplete = stat.openCount > 0 && stat.predictedCount === stat.openCount;
            const isPartial = stat.predictedCount > 0 && stat.predictedCount < stat.openCount;
            const isToday = dateKey === todayKey();

            return (
              <button
                key={dateKey}
                ref={isActive ? activeDateRef : undefined}
                onClick={() => setActiveDateKey(dateKey)}
                className={cn(
                  'shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border text-center min-w-[62px] transition-all',
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : isComplete
                    ? 'border-emerald-800/60 text-emerald-600 hover:border-emerald-600 hover:text-emerald-400'
                    : isPartial
                    ? 'border-amber-800/60 text-amber-500 hover:border-amber-500 hover:text-amber-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                )}
              >
                <span className="text-[10px] uppercase tracking-wide leading-none mb-1">
                  {isToday ? 'Hoy' : d.toLocaleDateString('es-MX', { weekday: 'short' })}
                </span>
                <span className="text-xl font-bold leading-none">{d.getDate()}</span>
                <span className="text-[10px] uppercase tracking-wide leading-none mt-1">
                  {d.toLocaleDateString('es-MX', { month: 'short' })}
                </span>
                {stat.openCount > 0 && (
                  <span
                    className={cn(
                      'text-[9px] font-semibold mt-1.5 leading-none',
                      isComplete
                        ? 'text-emerald-500'
                        : isPartial
                        ? 'text-amber-500'
                        : 'text-slate-600'
                    )}
                  >
                    {isComplete ? '✓' : `${stat.predictedCount}/${stat.openCount}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Missing predictions hint ───────────────────────────────────── */}
      {missingOnActiveDate > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          Te faltan {missingOnActiveDate} partido{missingOnActiveDate !== 1 ? 's' : ''} por pronosticar en este día.
        </div>
      )}

      {/* ── Matches for active date ────────────────────────────────────── */}
      {activeDateMatchGroups.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">Selecciona una fecha.</p>
      ) : (
        <div className="space-y-5">
          {activeDateMatchGroups.map(([roundName, matches]) => (
            <div key={roundName} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-800" />
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest shrink-0">
                  {roundName}
                </span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictions[match.id] ?? null}
                  onChange={handleChange}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Sticky save button — only visible when there are pending changes ── */}
      <AnimatePresence>
        {(pendingCount > 0 || saving) && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="sticky bottom-4 md:bottom-6 z-10"
          >
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
              size="lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving
                ? 'Guardando…'
                : `Guardar ${pendingCount} predicción${pendingCount !== 1 ? 'es' : ''}`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MatchCard } from './match-card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { RoundWithMatches, Prediction } from '@/types';
import { Save, Loader2, CheckCircle2, Circle, ChevronRight } from 'lucide-react';

interface Props {
  quinielaSlug: string;
  rounds: RoundWithMatches[];
  initialPredictions: Record<number, Prediction>;
}

// Per-round completion stats
interface RoundStat {
  openCount: number;
  predictedCount: number;
  isComplete: boolean;
  isPartial: boolean;
  hasOpen: boolean;
}

function computeRoundStat(
  round: RoundWithMatches,
  predictions: Record<number, Prediction>
): RoundStat {
  const openMatches = round.matches.filter((m) => m.is_prediction_open);
  const predictedCount = openMatches.filter(
    (m) => predictions[m.id]?.home_score !== undefined
  ).length;
  const openCount = openMatches.length;
  return {
    openCount,
    predictedCount,
    hasOpen: openCount > 0,
    isComplete: openCount > 0 && predictedCount === openCount,
    isPartial: predictedCount > 0 && predictedCount < openCount,
  };
}

export function PredictionForm({ quinielaSlug, rounds, initialPredictions }: Props) {
  const [predictions, setPredictions] =
    useState<Record<number, Prediction>>(initialPredictions);
  const [saving, setSaving] = useState(false);

  // Auto-select first incomplete open round, then any open round, then first round
  const [activeRoundId, setActiveRoundId] = useState<number | null>(() => {
    const firstIncomplete = rounds.find((r) => {
      const open = r.matches.filter((m) => m.is_prediction_open);
      return open.length > 0 && open.some((m) => !initialPredictions[m.id]);
    });
    if (firstIncomplete) return firstIncomplete.round.id;
    const firstOpen = rounds.find((r) => r.matches.some((m) => m.is_prediction_open));
    return firstOpen?.round.id ?? rounds[0]?.round.id ?? null;
  });

  const roundStats = useMemo(
    () =>
      new Map(
        rounds.map((r) => [r.round.id, computeRoundStat(r, predictions)])
      ),
    [rounds, predictions]
  );

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

  const activeRound = useMemo(
    () => rounds.find((r) => r.round.id === activeRoundId),
    [rounds, activeRoundId]
  );

  const pendingCount = useMemo(
    () =>
      Object.values(predictions).filter(
        (p) => p.home_score !== undefined && p.away_score !== undefined
      ).length,
    [predictions]
  );

  if (rounds.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-12">
        El calendario de partidos aún no está disponible.
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* ── Progress header ─────────────────────────────────────────── */}
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

      {/* ── Round selector ───────────────────────────────────────────── */}
      {rounds.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {rounds.map((r) => {
            const stat = roundStats.get(r.round.id)!;
            const isActive = activeRoundId === r.round.id;

            return (
              <button
                key={r.round.id}
                onClick={() => setActiveRoundId(r.round.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors border',
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : stat.isComplete
                    ? 'border-emerald-800/60 text-emerald-600 hover:border-emerald-600 hover:text-emerald-400'
                    : stat.isPartial
                    ? 'border-amber-800/60 text-amber-600 hover:border-amber-500 hover:text-amber-400'
                    : stat.hasOpen
                    ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                    : 'border-slate-800 text-slate-600'
                )}
              >
                <div>{r.round.name}</div>
                {stat.hasOpen && (
                  <div
                    className={cn(
                      'flex items-center gap-1 mt-0.5 text-[10px]',
                      stat.isComplete
                        ? 'text-emerald-500'
                        : stat.isPartial
                        ? 'text-amber-500'
                        : 'text-slate-600'
                    )}
                  >
                    {stat.isComplete ? (
                      <>
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Completada
                      </>
                    ) : (
                      <>
                        <Circle className="h-2.5 w-2.5" />
                        {stat.predictedCount}/{stat.openCount} pronósticos
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active round — inline label when only one round ─────────── */}
      {activeRound ? (
        <div className="space-y-3">
          {rounds.length === 1 && (
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              {activeRound.round.name}
            </p>
          )}

          {/* Round completion summary */}
          {(() => {
            const stat = roundStats.get(activeRound.round.id)!;
            if (!stat.hasOpen) return null;
            const missing = stat.openCount - stat.predictedCount;
            if (missing === 0) return null;
            return (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                Te faltan {missing} partido{missing !== 1 ? 's' : ''} por pronosticar en esta jornada.
              </div>
            );
          })()}

          {activeRound.matches.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              Sin partidos en esta jornada.
            </p>
          ) : (
            activeRound.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions[match.id] ?? null}
                onChange={handleChange}
              />
            ))
          )}
        </div>
      ) : (
        <p className="text-slate-500 text-sm text-center py-8">Selecciona una jornada.</p>
      )}

      {/* ── Sticky save button ───────────────────────────────────────── */}
      <div className="sticky bottom-4 md:bottom-6 z-10">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Button
            onClick={handleSave}
            disabled={saving || pendingCount === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-40"
            size="lg"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {pendingCount > 0
              ? `Guardar ${pendingCount} predicción${pendingCount !== 1 ? 'es' : ''}`
              : 'Guardar predicciones'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

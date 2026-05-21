'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MatchCard } from './match-card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { RoundWithMatches, Prediction } from '@/types';
import { Save, Loader2 } from 'lucide-react';

interface Props {
  quinielaSlug: string;
  rounds: RoundWithMatches[];
  initialPredictions: Record<number, Prediction>;
}

export function PredictionForm({ quinielaSlug, rounds, initialPredictions }: Props) {
  const [predictions, setPredictions] =
    useState<Record<number, Prediction>>(initialPredictions);
  const [saving, setSaving] = useState(false);
  const [activeRoundId, setActiveRoundId] = useState<number | null>(
    () => rounds.find((r) => r.matches.some((m) => m.is_prediction_open))?.round.id
      ?? rounds[0]?.round.id
      ?? null
  );

  const handleChange = useCallback(
    (matchId: number, home: number, away: number) => {
      setPredictions((prev) => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          match_id: matchId,
          home_score: home,
          away_score: away,
        },
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

  return (
    <div className="space-y-4 pb-4">
      {/* Round selector */}
      {rounds.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {rounds.map((r) => {
            const openCount = r.matches.filter((m) => m.is_prediction_open).length;
            return (
              <button
                key={r.round.id}
                onClick={() => setActiveRoundId(r.round.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border relative',
                  activeRoundId === r.round.id
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                )}
              >
                {r.round.name}
                {openCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                    {openCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Matches for selected round */}
      {activeRound ? (
        <div className="space-y-3">
          {activeRound.matches.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Sin partidos en esta jornada.</p>
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

      {/* Sticky save button */}
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

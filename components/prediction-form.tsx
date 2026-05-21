'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MatchCard } from './match-card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
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

  return (
    <div className="space-y-6 pb-4">
      {rounds.map((round) => (
        <div key={round.round.id}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {round.round.name}
          </h3>
          <div className="space-y-3">
            {round.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions[match.id] ?? null}
                onChange={handleChange}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-4 md:bottom-6 z-10">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
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
            Guardar predicciones
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

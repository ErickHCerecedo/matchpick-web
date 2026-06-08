'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, formatMatchDate } from '@/lib/utils';
import type { Match, Prediction } from '@/types';
import { Lock, CheckCircle2 } from 'lucide-react';

interface Props {
  match: Match;
  prediction: Prediction | null;
  onChange?: (matchId: number, home: number, away: number) => void;
  readOnly?: boolean;
  isSaved?: boolean;
}

const STATUS_LABELS: Record<Match['status'], string> = {
  scheduled: 'Programado',
  in_progress: '🔴 En vivo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_CLASSES: Record<Match['status'], string> = {
  scheduled: 'border-slate-600 text-slate-400',
  in_progress: 'border-emerald-500 text-emerald-400',
  finished: 'border-slate-600 text-slate-500',
  cancelled: 'border-red-800 text-red-400',
};

export function MatchCard({ match, prediction, onChange, readOnly, isSaved }: Props) {
  const [home, setHome] = useState<string>(prediction?.home_score?.toString() ?? '');
  const [away, setAway] = useState<string>(prediction?.away_score?.toString() ?? '');

  const isOpen = match.is_prediction_open && !readOnly;
  const hasResult = match.result !== null;
  const borderClass = STATUS_CLASSES[match.status];

  const handleChange = (side: 'home' | 'away', val: string) => {
    const numeric = val.replace(/\D/g, '');
    if (side === 'home') {
      setHome(numeric);
      if (numeric !== '' && away !== '') {
        onChange?.(match.id, parseInt(numeric), parseInt(away));
      }
    } else {
      setAway(numeric);
      if (home !== '' && numeric !== '') {
        onChange?.(match.id, parseInt(home), parseInt(numeric));
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('bg-slate-950 border rounded-xl p-4 space-y-3', borderClass)}
    >
      {/* Date + status */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatMatchDate(match.scheduled_at)}</span>
        <Badge variant="outline" className={cn('text-xs', borderClass)}>
          {STATUS_LABELS[match.status]}
        </Badge>
      </div>

      {/* Teams + scores */}
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {match.home_team?.flag_url && (
            <img
              src={match.home_team.flag_url}
              alt={match.home_team.short_name}
              className="w-6 h-4 object-cover rounded-sm shrink-0"
            />
          )}
          <span className="min-w-0 text-sm font-medium text-white truncate">
            {match.home_team?.name ?? 'TBD'}
          </span>
        </div>

        {/* Score area */}
        <div className="flex items-center gap-2 shrink-0">
          {hasResult ? (
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-8 text-center text-lg">{match.result!.home_score}</span>
              <span className="text-slate-500">-</span>
              <span className="w-8 text-center text-lg">{match.result!.away_score}</span>
            </div>
          ) : isOpen ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="99"
                value={home}
                onChange={(e) => handleChange('home', e.target.value)}
                className="w-12 text-center bg-slate-950 border-slate-700 text-white p-1 h-9"
                placeholder="0"
              />
              <span className="text-slate-500 font-bold">-</span>
              <Input
                type="number"
                min="0"
                max="99"
                value={away}
                onChange={(e) => handleChange('away', e.target.value)}
                className="w-12 text-center bg-slate-950 border-slate-700 text-white p-1 h-9"
                placeholder="0"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Lock className="h-3 w-3" />
              {prediction ? (
                <span className="text-xs font-mono">
                  {prediction.home_score} – {prediction.away_score}
                </span>
              ) : (
                <span className="text-xs">--</span>
              )}
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="min-w-0 text-sm font-medium text-white truncate text-right">
            {match.away_team?.name ?? 'TBD'}
          </span>
          {match.away_team?.flag_url && (
            <img
              src={match.away_team.flag_url}
              alt={match.away_team.short_name}
              className="w-6 h-4 object-cover rounded-sm shrink-0"
            />
          )}
        </div>
      </div>

      {/* Saved indicator */}
      {isOpen && isSaved && (
        <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Pronóstico guardado
        </div>
      )}

      {/* Points earned */}
      {prediction?.points !== undefined &&
        prediction.points !== null &&
        hasResult && (
          <div
            className={cn(
              'text-center text-xs font-medium py-1.5 rounded-lg',
              prediction.points === 3
                ? 'bg-emerald-500/20 text-emerald-400'
                : prediction.points === 1
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-slate-800 text-slate-500'
            )}
          >
            {prediction.points === 3
              ? '¡Marcador exacto! +3 pts'
              : prediction.points === 1
              ? 'Resultado correcto +1 pt'
              : 'Sin puntos'}
          </div>
        )}
    </motion.div>
  );
}

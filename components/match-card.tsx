'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn, formatMatchDate } from '@/lib/utils';
import type { Match, Prediction } from '@/types';
import { Lock, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  match: Match;
  prediction: Prediction | null;
  onChange?: (matchId: number, home: number, away: number) => void;
  readOnly?: boolean;
  isSaved?: boolean;
  showTeamColors?: boolean;
}

const STATUS_LABELS: Record<Match['status'], string> = {
  scheduled: 'Programado',
  in_progress: '🔴 En vivo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_BADGE_CLASSES: Record<Match['status'], string> = {
  scheduled: 'border-slate-600 text-slate-400',
  in_progress: 'border-emerald-500 text-emerald-400',
  finished: 'border-slate-600 text-slate-500',
  cancelled: 'border-red-800 text-red-400',
};

function ScoreStepper({
  value,
  onAdjust,
}: {
  value: number | null;
  onAdjust: (delta: number) => void;
}) {
  const atMin = value === null || value === 0;
  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={() => onAdjust(1)}
        className="w-9 h-7 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 border border-b-0 border-slate-600/80 rounded-t-lg text-slate-400 hover:text-emerald-400 active:bg-slate-700 transition-colors"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <div className="w-9 h-9 flex items-center justify-center border border-slate-600/80 bg-slate-950/90">
        {value === null ? (
          <span className="text-base font-bold text-slate-600 select-none">—</span>
        ) : (
          <span className="text-lg font-bold text-white tabular-nums font-mono">{value}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={atMin}
        className="w-9 h-7 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 border border-t-0 border-slate-600/80 rounded-b-lg text-slate-400 hover:text-red-400 active:bg-slate-700 disabled:opacity-25 disabled:cursor-default transition-colors"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MatchCard({ match, prediction, onChange, readOnly, isSaved, showTeamColors }: Props) {
  const [home, setHome] = useState<number | null>(prediction?.home_score ?? null);
  const [away, setAway] = useState<number | null>(prediction?.away_score ?? null);

  const isOpen = match.is_prediction_open && !readOnly;
  const hasResult = match.result !== null;
  const isClosed = !isOpen && !readOnly && !hasResult && match.status === 'scheduled';

  const hasFlags = !!(match.home_team?.flag_url || match.away_team?.flag_url);
  const showColors = showTeamColors && hasFlags && !isClosed;

  const handleAdjust = (side: 'home' | 'away', delta: number) => {
    const h = home !== null ? home : -1;
    const a = away !== null ? away : -1;
    if (side === 'home') {
      const next = Math.max(0, Math.min(99, h + delta));
      setHome(next);
      const effectiveAway = away !== null ? away : 0;
      if (away === null) setAway(0);
      onChange?.(match.id, next, effectiveAway);
    } else {
      const next = Math.max(0, Math.min(99, a + delta));
      setAway(next);
      const effectiveHome = home !== null ? home : 0;
      if (home === null) setHome(0);
      onChange?.(match.id, effectiveHome, next);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={isClosed ? { filter: 'grayscale(70%)' } : undefined}
      className={cn(
        'border rounded-xl relative overflow-hidden bg-slate-900 transition-all duration-200',
        isClosed
          ? 'border-slate-700/30 opacity-70'
          : match.status === 'in_progress'
          ? 'border-emerald-500/40'
          : 'border-slate-700/60',
      )}
    >

      {/* ── Content ── */}
      <div className="relative z-10 p-4 space-y-3">

        {/* Date + status */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{formatMatchDate(match.scheduled_at)}</span>
          <div className="flex items-center gap-1.5">
            {isClosed && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-800/60 border border-slate-700/50 px-1.5 py-0.5 rounded">
                <Lock className="h-2.5 w-2.5" />
                Cerrado
              </span>
            )}
            <Badge variant="outline" className={cn('text-xs', STATUS_BADGE_CLASSES[match.status])}>
              {STATUS_LABELS[match.status]}
            </Badge>
          </div>
        </div>

        {/* Teams + score — grid gives each team equal space, names wrap instead of truncate */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

          {/* Home */}
          <div className="flex flex-col gap-1.5">
            {match.home_team?.flag_url && (
              <img
                src={match.home_team.flag_url}
                alt={match.home_team.short_name ?? ''}
                className="w-7 h-5 sm:w-8 sm:h-6 object-cover rounded shadow-sm"
              />
            )}
            <span className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2">
              {match.home_team?.name ?? 'TBD'}
            </span>
          </div>

          {/* Center: score or steppers */}
          <div className="flex flex-col items-center gap-1 px-1">
            {hasResult ? (
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="w-6 text-center text-lg font-mono">{match.result!.home_score}</span>
                <span className="text-slate-500 text-sm">–</span>
                <span className="w-6 text-center text-lg font-mono">{match.result!.away_score}</span>
              </div>
            ) : isOpen ? (
              <div className="flex items-center gap-1.5">
                <ScoreStepper value={home} onAdjust={(d) => handleAdjust('home', d)} />
                <span className="text-slate-600 font-bold text-base select-none">–</span>
                <ScoreStepper value={away} onAdjust={(d) => handleAdjust('away', d)} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Lock className={cn('h-3.5 w-3.5', isClosed && !prediction ? 'text-amber-700/80' : 'text-slate-600')} />
                {prediction ? (
                  <span className="text-xs font-mono text-slate-400">
                    {prediction.home_score} – {prediction.away_score}
                  </span>
                ) : isClosed ? (
                  <span className="text-[10px] text-amber-700/70 font-medium text-center leading-tight">
                    Sin<br />pronóstico
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">--</span>
                )}
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-end gap-1.5">
            {match.away_team?.flag_url && (
              <img
                src={match.away_team.flag_url}
                alt={match.away_team.short_name ?? ''}
                className="w-7 h-5 sm:w-8 sm:h-6 object-cover rounded shadow-sm"
              />
            )}
            <span className="text-xs sm:text-sm font-semibold text-white text-right leading-tight line-clamp-2">
              {match.away_team?.name ?? 'TBD'}
            </span>
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
      </div>

      {/* ── Bottom team color strip ── */}
      {showColors && (
        <div className="relative z-10 h-1.5 flex" aria-hidden>
          <div className="flex-1 overflow-hidden">
            {match.home_team?.flag_url && (
              <img
                src={match.home_team.flag_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'saturate(3) brightness(1.1)', opacity: 1 }}
              />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {match.away_team?.flag_url && (
              <img
                src={match.away_team.flag_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'saturate(3) brightness(1.1)', opacity: 1 }}
              />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

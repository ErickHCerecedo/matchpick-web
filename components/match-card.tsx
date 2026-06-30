'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn, formatMatchDateParts } from '@/lib/utils';
import type { Match, Prediction, Round } from '@/types';
import { Lock, CheckCircle2, Loader2, ChevronUp, ChevronDown, Calendar, MapPin } from 'lucide-react';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';

const CARD_BG =
  'https://res.cloudinary.com/dr0klvutj/image/upload/v1781001150/MatchPick/file_00000000042c71fb8d0d570a11881d55.png';

const KNOCKOUT_TYPES = new Set([
  'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final',
]);

interface Props {
  match: Match;
  prediction: Prediction | null;
  onChange?: (matchId: number, home: number, away: number, penaltiesWinner?: 'home' | 'away' | null, penaltiesHome?: number | null, penaltiesAway?: number | null) => void;
  readOnly?: boolean;
  isSaved?: boolean;
  isAutoSaving?: boolean;
  showActualResult?: boolean;
  penaltiesEnabled?: boolean;
  penaltiesMode?: 'winner' | 'exact' | null;
  roundType?: Round['type'];
}

const STATUS_LABELS: Record<Match['status'], string> = {
  scheduled:   'Programado',
  in_progress: 'Jugando',
  finished:    'Finalizado',
  cancelled:   'Cancelado',
  postponed:   'Aplazado',
  suspended:   'Suspendido',
  paused:      'Pausado',
  rescheduled: 'Reagendado',
};

const STATUS_COLORS: Record<Match['status'], { dot: string; icon: string; badge: string; line: string }> = {
  scheduled:   { dot: 'bg-emerald-400',  icon: 'text-emerald-400',  badge: 'border-emerald-600/40 text-emerald-400',  line: 'bg-emerald-400/60'  },
  in_progress: { dot: 'bg-red-400',      icon: 'text-red-400',      badge: 'border-red-500/60 text-red-400',          line: 'bg-red-400/60'      },
  finished:    { dot: 'bg-slate-500',    icon: 'text-slate-500',    badge: 'border-slate-600 text-slate-500',          line: 'bg-slate-600/60'    },
  cancelled:   { dot: 'bg-slate-500',    icon: 'text-slate-500',    badge: 'border-slate-600 text-slate-500',          line: 'bg-slate-600/60'    },
  postponed:   { dot: 'bg-orange-400',   icon: 'text-orange-400',   badge: 'border-orange-500/50 text-orange-400',     line: 'bg-orange-400/60'   },
  suspended:   { dot: 'bg-red-500',      icon: 'text-red-500',      badge: 'border-red-600/50 text-red-500',           line: 'bg-red-500/60'      },
  paused:      { dot: 'bg-yellow-400',   icon: 'text-yellow-400',   badge: 'border-yellow-500/50 text-yellow-400',     line: 'bg-yellow-400/60'   },
  rescheduled: { dot: 'bg-sky-400',      icon: 'text-sky-400',      badge: 'border-sky-500/50 text-sky-400',           line: 'bg-sky-400/60'      },
};

function PenaltyBadge({ home, away }: { home: number; away: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/30 text-[10px] font-bold text-sky-400 tabular-nums leading-none">
      <span>⚽</span>
      <span>{home}–{away}</span>
      <span className="text-sky-600 font-medium">p.</span>
    </span>
  );
}

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
        className="w-10 h-8 flex items-center justify-center bg-black/40 hover:bg-slate-700/80 border border-b-0 border-slate-700 rounded-t-lg text-slate-400 hover:text-emerald-400 active:bg-slate-700 transition-colors"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <div className="w-10 h-10 flex items-center justify-center border border-slate-700 bg-black/50">
        {value === null ? (
          <span className="text-lg font-bold text-slate-600 select-none">—</span>
        ) : (
          <span className="text-xl font-bold text-white tabular-nums font-mono">{value}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={atMin}
        className="w-10 h-8 flex items-center justify-center bg-black/40 hover:bg-slate-700/80 border border-t-0 border-slate-700 rounded-b-lg text-slate-400 hover:text-red-400 active:bg-slate-700 disabled:opacity-25 disabled:cursor-default transition-colors"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MatchCard({ match, prediction, onChange, readOnly, isSaved, isAutoSaving, showActualResult, penaltiesEnabled, penaltiesMode, roundType }: Props) {
  const [home, setHome] = useState<number | null>(prediction?.home_score ?? null);
  const [away, setAway] = useState<number | null>(prediction?.away_score ?? null);
  const [penWinner, setPenWinner] = useState<'home' | 'away' | null>(prediction?.penalties_winner ?? null);
  const [penHome, setPenHome] = useState<number | null>(prediction?.penalties_home ?? null);
  const [penAway, setPenAway] = useState<number | null>(prediction?.penalties_away ?? null);

  const isOpen = match.is_prediction_open && !readOnly;
  const hasResult = match.result !== null;
  const isClosed = !isOpen && !readOnly && !hasResult && match.status === 'scheduled';
  const isKnockout = roundType ? KNOCKOUT_TYPES.has(roundType) : false;

  // Show penalty input when: quiniela has penalties enabled with a mode, it's a knockout match,
  // and the user is predicting a draw
  const isDraw = home !== null && away !== null && home === away;
  const showPenaltyInput = isOpen && penaltiesEnabled && penaltiesMode && isKnockout && isDraw;

  // When draw condition changes, emit current penalty state
  useEffect(() => {
    if (!showPenaltyInput) {
      // Clear penalty state when no longer in draw
      if (penWinner !== null || penHome !== null || penAway !== null) {
        setPenWinner(null);
        setPenHome(null);
        setPenAway(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPenaltyInput]);

  const { date, time } = formatMatchDateParts(match.scheduled_at);
  const sc = STATUS_COLORS[match.status];

  const fireChange = (h: number, a: number, pw: typeof penWinner, ph: typeof penHome, pa: typeof penAway) => {
    onChange?.(match.id, h, a, pw, ph, pa);
  };

  const handleAdjust = (side: 'home' | 'away', delta: number) => {
    const h = home !== null ? home : -1;
    const a = away !== null ? away : -1;
    if (side === 'home') {
      const next = Math.max(0, Math.min(99, h + delta));
      const effectiveAway = away !== null ? away : 0;
      setHome(next);
      if (away === null) setAway(0);
      fireChange(next, effectiveAway, penWinner, penHome, penAway);
    } else {
      const next = Math.max(0, Math.min(99, a + delta));
      const effectiveHome = home !== null ? home : 0;
      setAway(next);
      if (home === null) setHome(0);
      fireChange(effectiveHome, next, penWinner, penHome, penAway);
    }
  };

  const handlePenWinner = (winner: 'home' | 'away') => {
    const next = penWinner === winner ? null : winner;
    setPenWinner(next);
    fireChange(home!, away!, next, penHome, penAway);
  };

  const handlePenAdjust = (side: 'home' | 'away', delta: number) => {
    if (side === 'home') {
      const next = Math.max(0, Math.min(30, (penHome ?? -1) + delta));
      const effectivePenAway = penAway ?? 0;
      setPenHome(next);
      if (penAway === null) setPenAway(0);
      fireChange(home!, away!, penWinner, next, effectivePenAway);
    } else {
      const next = Math.max(0, Math.min(30, (penAway ?? -1) + delta));
      const effectivePenHome = penHome ?? 0;
      setPenAway(next);
      if (penHome === null) setPenHome(0);
      fireChange(home!, away!, penWinner, effectivePenHome, next);
    }
  };

  // Penalty result info (for finished matches)
  const penaltyResult = hasResult && match.result?.home_score_penalties != null
    ? {
        homeScore: match.result.home_score_penalties,
        awayScore: match.result.away_score_penalties!,
        winner: match.result.home_score_penalties > match.result.away_score_penalties!
          ? 'home' as const
          : 'away' as const,
      }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'border rounded-xl relative overflow-hidden transition-all duration-200',
        isClosed
          ? 'border-slate-800/40 opacity-[0.65]'
          : match.status === 'in_progress'
          ? 'border-red-500/40'
          : 'border-slate-700/60',
      )}
    >
      {/* Background image */}
      <img
        src={CARD_BG}
        alt=""
        aria-hidden
        className="absolute inset-x-0 top-0 w-full h-[200px] object-cover object-center z-0 pointer-events-none select-none"
      />
      <div className="absolute inset-0 z-0 bg-slate-950/78" />

      <div className="relative z-10 p-4 space-y-3">

        {/* Date + status row */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className={cn('h-3.5 w-3.5 shrink-0', sc.icon)} />
            <span className="font-medium">{date}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">{time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isClosed && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-black/40 border border-slate-700/50 px-1.5 py-0.5 rounded">
                <Lock className="h-2.5 w-2.5" />
                Cerrado
              </span>
            )}
            <Badge variant="outline" className={cn('text-xs flex items-center gap-1', sc.badge)}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot, match.status === 'in_progress' && 'animate-pulse')} />
              {STATUS_LABELS[match.status]}
            </Badge>
          </div>
        </div>

        {/* Teams + scores */}
        <div className="flex items-center gap-3">

          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {match.home_team?.flag_url ? (
              <img
                src={match.home_team.flag_url}
                alt={match.home_team.short_name}
                className="w-12 h-8 object-cover rounded shadow-md"
              />
            ) : (
              <FlagPlaceholder size="lg" />
            )}
            <span className="w-full text-[11px] font-semibold text-white text-center leading-tight truncate px-1 mt-0.5">
              {match.home_team?.name ?? 'TBD'}
            </span>
            <div className={cn('h-0.5 w-8 rounded-full', sc.line)} />
          </div>

          {/* Score / VS area */}
          <div className="flex items-center gap-2 shrink-0">
            {match.status === 'in_progress' && hasResult ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-8 text-center text-xl tabular-nums font-mono text-red-300">{match.result!.home_score}</span>
                  <span className="text-slate-500 text-sm font-normal">–</span>
                  <span className="w-8 text-center text-xl tabular-nums font-mono text-red-300">{match.result!.away_score}</span>
                </div>
                {prediction && (
                  <span className="text-[10px] text-slate-500 tabular-nums font-mono">
                    pronóstico {prediction.home_score}–{prediction.away_score}
                  </span>
                )}
              </div>
            ) : hasResult ? (
              prediction ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-8 text-center text-xl tabular-nums font-mono">{prediction.home_score}</span>
                    <span className="text-slate-500 text-sm font-normal">–</span>
                    <span className="w-8 text-center text-xl tabular-nums font-mono">{prediction.away_score}</span>
                  </div>
                  {penaltyResult && <PenaltyBadge home={penaltyResult.homeScore} away={penaltyResult.awayScore} />}
                </div>
              ) : showActualResult ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-8 text-center text-xl tabular-nums font-mono">{match.result!.home_score}</span>
                    <span className="text-slate-500 text-sm font-normal">–</span>
                    <span className="w-8 text-center text-xl tabular-nums font-mono">{match.result!.away_score}</span>
                  </div>
                  {penaltyResult && <PenaltyBadge home={penaltyResult.homeScore} away={penaltyResult.awayScore} />}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl font-bold font-mono text-slate-600 tabular-nums tracking-widest">N/P</span>
                  <span className="text-[10px] text-slate-600 font-medium">Sin pronóstico</span>
                </div>
              )
            ) : isOpen ? (
              <div className="flex items-center gap-2">
                <ScoreStepper value={home} onAdjust={(d) => handleAdjust('home', d)} />
                <div className="flex flex-col items-center justify-center px-0.5">
                  <span className="text-[10px] font-black tracking-widest text-white/80 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 leading-none backdrop-blur-sm">
                    VS
                  </span>
                </div>
                <ScoreStepper value={away} onAdjust={(d) => handleAdjust('away', d)} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-black tracking-widest text-white/80 bg-white/10 border border-white/20 rounded px-2.5 py-0.5 backdrop-blur-sm">
                  VS
                </span>
                <div className="flex items-center gap-1.5">
                  <Lock className={cn('h-3 w-3 shrink-0', isClosed && !prediction ? 'text-amber-700/80' : 'text-slate-600')} />
                  {prediction ? (
                    <span className="text-xs font-mono text-slate-400">
                      {prediction.home_score} – {prediction.away_score}
                    </span>
                  ) : isClosed ? (
                    <span className="text-[11px] text-amber-700/70 font-medium">Sin pronóstico</span>
                  ) : (
                    <span className="text-xs text-slate-600">--</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {match.away_team?.flag_url ? (
              <img
                src={match.away_team.flag_url}
                alt={match.away_team.short_name}
                className="w-12 h-8 object-cover rounded shadow-md"
              />
            ) : (
              <FlagPlaceholder size="lg" />
            )}
            <span className="w-full text-[11px] font-semibold text-white text-center leading-tight truncate px-1 mt-0.5">
              {match.away_team?.name ?? 'TBD'}
            </span>
            <div className={cn('h-0.5 w-8 rounded-full', sc.line)} />
          </div>

        </div>

        {/* ── Penalty prediction input (open, knockout, draw predicted) ── */}
        {showPenaltyInput && (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
              ⚽ Penales — empate en 90 min
            </p>
            {penaltiesMode === 'winner' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePenWinner('home')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-bold border transition-all',
                    penWinner === 'home'
                      ? 'bg-sky-500/30 border-sky-400/60 text-sky-200'
                      : 'bg-slate-900/60 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  )}
                >
                  {match.home_team?.short_name ?? 'Local'} gana
                </button>
                <button
                  type="button"
                  onClick={() => handlePenWinner('away')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-bold border transition-all',
                    penWinner === 'away'
                      ? 'bg-sky-500/30 border-sky-400/60 text-sky-200'
                      : 'bg-slate-900/60 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  )}
                >
                  {match.away_team?.short_name ?? 'Visitante'} gana
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ScoreStepper value={penHome} onAdjust={(d) => handlePenAdjust('home', d)} />
                <span className="text-slate-500 font-mono text-sm">–</span>
                <ScoreStepper value={penAway} onAdjust={(d) => handlePenAdjust('away', d)} />
                <span className="text-[10px] text-slate-500 ml-1">marcador en penales</span>
              </div>
            )}
          </div>
        )}

        {/* Venue */}
        {match.venue && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <MapPin className={cn('h-3 w-3 shrink-0', sc.icon)} />
            <span className="truncate max-w-[80%]">{match.venue}</span>
          </div>
        )}

        {/* Saved / auto-saving indicator */}
        {isOpen && (
          isAutoSaving ? (
            <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando…
            </div>
          ) : isSaved ? (
            <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Pronóstico guardado
            </div>
          ) : null
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
                  : 'bg-black/30 text-slate-500'
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
    </motion.div>
  );
}

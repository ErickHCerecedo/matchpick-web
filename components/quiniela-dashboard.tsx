'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatMatchDate } from '@/lib/utils';
import { groupByDate, toLocalDateKey, todayKey } from '@/lib/date-utils';
import type { Standing, RoundWithMatches, Match } from '@/types';
import {
  Trophy, Target, Clock, TrendingUp,
  Crown, Star, ArrowRight, CalendarCheck, Share2, Pencil,
  Zap, Percent,
} from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────

function PointsBadge({ points }: { points: number | null | undefined }) {
  if (points === 3)
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
        +3 pts
      </span>
    );
  if (points === 1)
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
        +1 pt
      </span>
    );
  if (points === 0)
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-600 border border-slate-800 shrink-0">
        0 pts
      </span>
    );
  return null;
}

function rankColors(rank: number) {
  if (rank === 1) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' };
  if (rank === 2) return { bg: 'bg-slate-400/8',  border: 'border-slate-500/30', text: 'text-slate-300' };
  if (rank === 3) return { bg: 'bg-orange-600/10', border: 'border-orange-500/30', text: 'text-orange-400' };
  return { bg: 'bg-slate-900', border: 'border-slate-800', text: 'text-slate-600' };
}

// ── PendingMatchesAlert ────────────────────────────────────────────────────

function PendingMatchesAlert({
  rounds,
  onGoToPredictions,
}: {
  rounds: RoundWithMatches[];
  onGoToPredictions: () => void;
}) {
  const today = useMemo(() => todayKey(), []);
  const tomorrowKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalDateKey(d.toISOString());
  }, []);

  const alertData = useMemo(() => {
    const pendingByDay: Record<string, Match[]> = { [today]: [], [tomorrowKey]: [] };
    for (const r of rounds) {
      for (const m of r.matches) {
        if (!m.is_prediction_open || m.my_prediction) continue;
        const dk = toLocalDateKey(m.scheduled_at);
        if (dk === today || dk === tomorrowKey) pendingByDay[dk].push(m);
      }
    }

    const todayPending = pendingByDay[today];
    const tomorrowPending = pendingByDay[tomorrowKey];

    const [pending, dayLabel] =
      todayPending.length > 0
        ? [todayPending, 'hoy']
        : tomorrowPending.length > 0
        ? [tomorrowPending, 'mañana']
        : [[], ''];

    if (pending.length === 0) return null;

    const sorted = [...pending].sort((a, b) =>
      a.prediction_closes_at.localeCompare(b.prediction_closes_at)
    );

    return { count: pending.length, dayLabel, closestAt: sorted[0].prediction_closes_at };
  }, [rounds, today, tomorrowKey]);

  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!alertData?.closestAt) return;
    const update = () => {
      const diff = new Date(alertData.closestAt).getTime() - Date.now();
      if (diff <= 0) { setCountdown(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 48) { setCountdown(''); return; }
      setCountdown(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [alertData?.closestAt]);

  if (!alertData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800/80"
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 shrink-0">
        <Zap className="h-5 w-5 text-black fill-black" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-snug">Te toca jugar</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">
          Tienes{' '}
          <span className="font-bold text-amber-400">
            {alertData.count} partido{alertData.count !== 1 ? 's' : ''}
          </span>{' '}
          de {alertData.dayLabel} sin pronosticar.{' '}
          {countdown ? (
            <span className="text-amber-500/80 font-medium">Cierra en {countdown}.</span>
          ) : (
            <span className="text-slate-500">Cierran cuando inicie cada juego.</span>
          )}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onGoToPredictions}
        className="flex items-center gap-1.5 shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black text-xs font-bold transition-colors whitespace-nowrap"
      >
        Pronosticar ahora
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ── MyStatsCard ────────────────────────────────────────────────────────────

function MyStatsCard({
  myStanding,
  leader,
  totalParticipants,
  onShare,
}: {
  myStanding: Standing;
  leader: Standing | null;
  totalParticipants: number;
  onShare?: () => void;
}) {
  const gap =
    leader && leader.user.id !== myStanding.user.id
      ? leader.total_points - myStanding.total_points
      : null;
  const isLeader = myStanding.rank === 1;
  const { bg, border, text } = rankColors(myStanding.rank);

  // Precision = % of predictions that scored
  const precision =
    myStanding.predictions_made > 0
      ? Math.round(
          ((myStanding.exact_scores + myStanding.correct_results) /
            myStanding.predictions_made) *
            100
        )
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-slate-800 bg-slate-950 p-5"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div
            className={cn(
              'flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 border',
              bg,
              border
            )}
          >
            {isLeader ? (
              <Crown className={cn('h-5 w-5', text)} />
            ) : (
              <>
                <span className={cn('text-xl font-bold leading-none tabular-nums', text)}>
                  {myStanding.rank}
                </span>
                <span className="text-[9px] text-slate-700 mt-0.5 uppercase tracking-wide">
                  lugar
                </span>
              </>
            )}
          </div>

          {/* Name */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white leading-snug">
                {myStanding.user.name}
              </span>
              <span className="text-[10px] text-slate-600 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded leading-none">
                tú
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLeader
                ? 'Liderando la quiniela'
                : `Posición ${myStanding.rank} de ${totalParticipants}`}
            </p>
          </div>
        </div>

        {/* Points */}
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-white tabular-nums leading-none">
            {myStanding.total_points}
          </p>
          <p className="text-[11px] text-slate-600 mt-1 uppercase tracking-wide">puntos</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 mt-4 border border-slate-800 rounded-lg overflow-hidden divide-x divide-slate-800">
        <div className="px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{myStanding.exact_scores}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Marcador exacto</p>
          <p className="text-[9px] text-slate-700 mt-0.5">+3 pts c/u</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{myStanding.correct_results}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Ganador correcto</p>
          <p className="text-[9px] text-slate-700 mt-0.5">+1 pt c/u</p>
        </div>
        <div className="px-3 py-2.5 text-center flex flex-col items-center justify-center">
          {precision !== null ? (
            <>
              <div className="flex items-baseline gap-0.5">
                <p className="text-lg font-bold text-white tabular-nums">{precision}</p>
                <Percent className="h-3.5 w-3.5 text-slate-400 mb-0.5" />
              </div>
            </>
          ) : (
            <p className="text-lg font-bold text-slate-700">—</p>
          )}
          <p className="text-[10px] text-slate-500 mt-0.5">Precisión</p>
          <p className="text-[9px] text-slate-700 mt-0.5">de aciertos</p>
        </div>
      </div>

      {/* Footer */}
      {((gap !== null && gap > 0) || onShare) && (
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-800/60">
          {gap !== null && gap > 0 ? (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 shrink-0" />A{' '}
              <span className="font-semibold text-slate-300">{gap} pts</span> del líder
              <span className="text-slate-700">({leader!.user.name})</span>
            </p>
          ) : (
            <span />
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 hover:text-emerald-400 transition-colors"
            >
              <Share2 className="h-3 w-3" />
              Compartir posición
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Leaderboard ────────────────────────────────────────────────────────────

function LeaderboardSection({
  standings,
  currentUserId,
}: {
  standings: Standing[];
  currentUserId?: number;
}) {
  const top5 = standings.slice(0, 5);
  const myStanding = standings.find((s) => s.user.id === currentUserId);
  const showMyRow = myStanding && myStanding.rank > 5;
  const leader = standings[0];
  const leaderPts = leader?.total_points ?? 1;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Trophy className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Posiciones</h3>
        <span className="ml-auto text-[10px] text-slate-600">
          {standings.length} participantes
        </span>
      </div>

      <div className="divide-y divide-slate-800/50">
        {top5.map((s, idx) => {
          const isMe = s.user.id === currentUserId;
          const pct = leaderPts > 0 ? Math.round((s.total_points / leaderPts) * 100) : 0;
          const { text: rankText } = rankColors(s.rank);
          return (
            <motion.div
              key={s.user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className={cn('flex items-center gap-3 px-4 py-2.5', isMe ? 'bg-emerald-500/5' : '')}
            >
              <span className={cn('w-5 text-center text-xs font-bold shrink-0 tabular-nums', rankText)}>
                {s.rank}
              </span>

              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={s.user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-slate-800 text-white text-[10px]">
                  {s.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-medium truncate', isMe ? 'text-emerald-400' : 'text-white')}>
                    {s.user.name}
                  </span>
                  {isMe && <Star className="h-2.5 w-2.5 text-emerald-500 shrink-0 fill-emerald-500" />}
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      s.rank === 1 ? 'bg-emerald-500/70' : isMe ? 'bg-emerald-500/40' : 'bg-slate-700'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.05, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <span className="text-sm font-bold text-white tabular-nums shrink-0">
                {s.total_points}
                <span className="text-[10px] text-slate-600 font-normal"> pts</span>
              </span>
            </motion.div>
          );
        })}

        {showMyRow && (
          <>
            <div className="flex items-center justify-center py-1.5">
              <span className="text-[10px] text-slate-800">· · ·</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/5">
              <span className="w-5 text-center text-xs font-bold text-slate-500 shrink-0 tabular-nums">
                {myStanding.rank}
              </span>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={myStanding.user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-slate-800 text-white text-[10px]">
                  {myStanding.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-emerald-400 truncate flex items-center gap-1">
                  {myStanding.user.name}
                  <Star className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                </span>
              </div>
              <span className="text-sm font-bold text-white tabular-nums shrink-0">
                {myStanding.total_points}
                <span className="text-[10px] text-slate-600 font-normal"> pts</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Próximos partidos ──────────────────────────────────────────────────────

function UpcomingMatches({
  rounds,
  onGoToPredictions,
}: {
  rounds: RoundWithMatches[];
  onGoToPredictions: () => void;
}) {
  const nextDayData = useMemo(() => {
    const byDate = new Map<string, { match: Match; roundName: string }[]>();
    for (const r of rounds) {
      for (const m of r.matches) {
        if (!m.is_prediction_open) continue;
        const dk = toLocalDateKey(m.scheduled_at);
        if (!byDate.has(dk)) byDate.set(dk, []);
        byDate.get(dk)!.push({ match: m, roundName: r.round.name });
      }
    }

    const sortedDates = [...byDate.keys()].sort();
    if (sortedDates.length === 0) return null;

    const targetDate = sortedDates[0];
    const matches = byDate.get(targetDate)!.sort((a, b) =>
      a.match.scheduled_at.localeCompare(b.match.scheduled_at)
    );
    const pending = matches.filter(({ match }) => !match.my_prediction).length;
    const isToday = targetDate === todayKey();

    // Format date label
    const d = new Date(targetDate + 'T12:00:00');
    const dayLabel = isToday
      ? 'Hoy'
      : d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });

    return { date: targetDate, matches, pending, isToday, dayLabel };
  }, [rounds]);

  const hasAnyOpen = nextDayData !== null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Clock className="h-4 w-4 text-slate-400" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white leading-none">Próximos partidos</h3>
          {nextDayData && (
            <p className="text-[10px] text-slate-600 mt-0.5 capitalize">{nextDayData.dayLabel}</p>
          )}
        </div>
        {nextDayData && nextDayData.pending > 0 && (
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
            {nextDayData.pending} sin pronosticar
          </span>
        )}
        {nextDayData && nextDayData.pending === 0 && (
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ✓ listos
          </span>
        )}
      </div>

      {!hasAnyOpen ? (
        <div className="flex items-center gap-2 px-4 py-5 justify-center">
          <CalendarCheck className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-slate-500">
            {rounds.length === 0
              ? 'El calendario no está disponible aún.'
              : '¡Todos los partidos han cerrado!'}
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-800/40">
            {nextDayData!.matches.map(({ match, roundName }) => {
              const pred = match.my_prediction;
              return (
                <div key={match.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {match.home_team?.flag_url && (
                        <img
                          src={match.home_team.flag_url}
                          alt=""
                          className="w-4 h-3 object-cover rounded-[2px] shrink-0"
                        />
                      )}
                      <span className="text-xs font-semibold text-white truncate">
                        {match.home_team?.short_name ?? '?'}
                      </span>
                      <span className="text-slate-700 text-[10px] shrink-0">vs</span>
                      <span className="text-xs font-semibold text-white truncate">
                        {match.away_team?.short_name ?? '?'}
                      </span>
                      {match.away_team?.flag_url && (
                        <img
                          src={match.away_team.flag_url}
                          alt=""
                          className="w-4 h-3 object-cover rounded-[2px] shrink-0"
                        />
                      )}
                    </div>

                    {pred ? (
                      <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                        <Pencil className="h-2.5 w-2.5 text-emerald-500/60" />
                        <span className="text-xs font-bold text-emerald-400 tabular-nums">
                          {pred.home_score} – {pred.away_score}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-500/60 shrink-0 border border-amber-500/15 rounded-lg px-2 py-1 bg-amber-500/5">
                        pendiente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <p className="text-[10px] text-slate-600">
                      {formatMatchDate(match.scheduled_at)} · {roundName}
                    </p>
                    {pred && (
                      <span className="text-[10px] text-emerald-600/60">· tu pronóstico</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onGoToPredictions}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 border-t border-slate-800/50 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
          >
            Ver todos los partidos
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ── Mis últimos resultados ─────────────────────────────────────────────────

function RecentResults({ rounds }: { rounds: RoundWithMatches[] }) {
  const recentWithPrediction = useMemo(() => {
    const finished = [];
    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.result !== null && m.my_prediction !== null) {
          finished.push({ match: m, roundName: r.round.name });
        }
      }
    }
    return finished
      .sort((a, b) =>
        (b.match.scheduled_at ?? '').localeCompare(a.match.scheduled_at ?? '')
      )
      .slice(0, 4);
  }, [rounds]);

  const totalEarned = useMemo(() => {
    let pts = 0;
    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.my_prediction?.points != null) pts += m.my_prediction.points;
      }
    }
    return pts;
  }, [rounds]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Target className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-white">Mis últimos resultados</h3>
        {totalEarned > 0 && (
          <span className="ml-auto text-[10px] text-slate-600">
            Total:{' '}
            <span className="font-bold text-slate-300">{totalEarned}</span> pts
          </span>
        )}
      </div>

      {recentWithPrediction.length === 0 ? (
        <p className="text-sm text-slate-600 text-center py-5 px-4">
          Aún no hay partidos finalizados con tus pronósticos.
        </p>
      ) : (
        <div className="divide-y divide-slate-800/40">
          {recentWithPrediction.map(({ match, roundName }) => {
            const pred = match.my_prediction!;
            const res = match.result!;
            return (
              <div key={match.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {match.home_team?.flag_url && (
                      <img
                        src={match.home_team.flag_url}
                        alt=""
                        className="w-4 h-3 object-cover rounded-[2px] shrink-0"
                      />
                    )}
                    <span className="text-xs font-semibold text-white truncate">
                      {match.home_team?.short_name ?? '?'}
                    </span>
                    <span className="text-xs font-bold text-white font-mono px-2 py-0.5 bg-slate-800 border border-slate-700 rounded shrink-0">
                      {res.home_score} – {res.away_score}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {match.away_team?.short_name ?? '?'}
                    </span>
                    {match.away_team?.flag_url && (
                      <img
                        src={match.away_team.flag_url}
                        alt=""
                        className="w-4 h-3 object-cover rounded-[2px] shrink-0"
                      />
                    )}
                  </div>
                  <PointsBadge points={pred.points} />
                </div>

                <div className="flex items-center gap-1.5">
                  <Pencil className="h-2.5 w-2.5 text-slate-600 shrink-0" />
                  <p className="text-[10px] text-slate-600">
                    Mi pronóstico:{' '}
                    <span className="font-mono text-slate-500">
                      {pred.home_score} – {pred.away_score}
                    </span>
                    <span className="mx-1 text-slate-700">·</span>
                    {roundName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  standings: Standing[];
  rounds: RoundWithMatches[];
  currentUserId?: number;
  totalParticipants: number;
  onGoToPredictions: () => void;
  onShare?: () => void;
}

export function QuinielaDashboard({
  standings,
  rounds,
  currentUserId,
  totalParticipants,
  onGoToPredictions,
  onShare,
}: Props) {
  const myStanding = standings.find((s) => s.user.id === currentUserId);
  const leader = standings[0] ?? null;

  if (standings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trophy className="h-12 w-12 text-slate-800 mb-4" />
        <p className="text-slate-500 text-sm font-medium">Aún no hay participantes</p>
        <p className="text-slate-700 text-xs mt-1">
          El dashboard aparecerá cuando haya datos disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert banner — pending predictions for today/tomorrow */}
      <PendingMatchesAlert rounds={rounds} onGoToPredictions={onGoToPredictions} />

      {/* Two-column grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: My stats + Upcoming */}
        <div className="space-y-4">
          {myStanding && (
            <MyStatsCard
              myStanding={myStanding}
              leader={leader}
              totalParticipants={totalParticipants}
              onShare={onShare}
            />
          )}
          <UpcomingMatches rounds={rounds} onGoToPredictions={onGoToPredictions} />
        </div>

        {/* Right: Leaderboard + Recent results */}
        <div className="space-y-4">
          <LeaderboardSection standings={standings} currentUserId={currentUserId} />
          <RecentResults rounds={rounds} />
        </div>
      </div>
    </div>
  );
}

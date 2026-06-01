'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatMatchDate } from '@/lib/utils';
import type { Standing, RoundWithMatches } from '@/types';
import {
  Trophy, Target, CheckCircle2, Clock, TrendingUp,
  Crown, Medal, Star, ArrowRight, CalendarCheck,
} from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 shrink-0">
        <Crown className="h-5 w-5 text-yellow-400" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-400/15 border-2 border-slate-400/40 shrink-0">
        <Medal className="h-5 w-5 text-slate-300" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-700/15 border-2 border-orange-600/40 shrink-0">
        <Medal className="h-5 w-5 text-orange-400" />
      </div>
    );
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 shrink-0">
      <span className="text-sm font-bold text-slate-400">{rank}</span>
    </div>
  );
}

function PointsBadge({ points }: { points: number | null | undefined }) {
  if (points === 3)
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
        🎯 +3
      </span>
    );
  if (points === 1)
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
        ✓ +1
      </span>
    );
  if (points === 0)
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 shrink-0">
        ✗ 0
      </span>
    );
  return null;
}

// ── sub-sections ──────────────────────────────────────────────────────────

function MyStatsCard({
  myStanding,
  leader,
}: {
  myStanding: Standing;
  leader: Standing | null;
}) {
  const gap = leader && leader.user.id !== myStanding.user.id
    ? leader.total_points - myStanding.total_points
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'rounded-xl border p-4 space-y-3',
        myStanding.rank === 1
          ? 'bg-yellow-500/5 border-yellow-500/20'
          : myStanding.rank === 2
          ? 'bg-slate-400/5 border-slate-600'
          : myStanding.rank === 3
          ? 'bg-orange-700/5 border-orange-700/20'
          : 'bg-slate-900 border-slate-800'
      )}
    >
      {/* Top row: rank + name + points */}
      <div className="flex items-center gap-3">
        <RankDisplay rank={myStanding.rank} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white truncate">
              {myStanding.user.name}
            </span>
            <span className="text-[10px] text-emerald-500/70 shrink-0">tú</span>
          </div>
          <p className="text-xs text-slate-500">
            {myStanding.rank === 1 ? '🏆 Líder de la quiniela' : `Posición #${myStanding.rank}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-white tabular-nums">
            {myStanding.total_points}
          </p>
          <p className="text-[10px] text-slate-500">puntos</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60">
        <div className="text-center">
          <p className="text-base font-bold text-emerald-400 tabular-nums">
            {myStanding.exact_scores}
          </p>
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
            🎯 exactos
          </p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-blue-400 tabular-nums">
            {myStanding.correct_results}
          </p>
          <p className="text-[10px] text-slate-500">✓ correctos</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-300 tabular-nums">
            {myStanding.predictions_made}
          </p>
          <p className="text-[10px] text-slate-500">pronósticos</p>
        </div>
      </div>

      {/* Gap to leader */}
      {gap !== null && gap > 0 && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 shrink-0" />
          A <span className="font-semibold text-slate-300">{gap} pts</span> del líder
          <span className="font-medium text-slate-400">({leader!.user.name})</span>
        </p>
      )}
    </motion.div>
  );
}

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
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
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
          return (
            <motion.div
              key={s.user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5',
                isMe ? 'bg-emerald-500/5' : ''
              )}
            >
              {/* Rank */}
              <span
                className={cn(
                  'w-5 text-center text-xs font-bold shrink-0 tabular-nums',
                  s.rank === 1 ? 'text-yellow-400' :
                  s.rank === 2 ? 'text-slate-300' :
                  s.rank === 3 ? 'text-orange-400' : 'text-slate-600'
                )}
              >
                {s.rank}
              </span>

              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={s.user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-slate-700 text-white text-[10px]">
                  {s.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-medium truncate', isMe ? 'text-emerald-400' : 'text-white')}>
                    {s.user.name}
                  </span>
                  {isMe && (
                    <Star className="h-2.5 w-2.5 text-emerald-500 shrink-0 fill-emerald-500" />
                  )}
                </div>
                {/* Progress bar */}
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      s.rank === 1 ? 'bg-yellow-400/60' :
                      isMe ? 'bg-emerald-500/60' : 'bg-slate-600'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.05, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <span className="text-sm font-bold text-white tabular-nums shrink-0">
                {s.total_points}
                <span className="text-[10px] text-slate-500 font-normal"> pts</span>
              </span>
            </motion.div>
          );
        })}

        {/* My row if outside top 5 */}
        {showMyRow && (
          <>
            <div className="flex items-center justify-center py-1.5">
              <span className="text-[10px] text-slate-700">· · ·</span>
            </div>
            <div className={cn('flex items-center gap-3 px-4 py-2.5 bg-emerald-500/5')}>
              <span className="w-5 text-center text-xs font-bold text-slate-500 shrink-0 tabular-nums">
                {myStanding.rank}
              </span>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={myStanding.user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-slate-700 text-white text-[10px]">
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
                <span className="text-[10px] text-slate-500 font-normal"> pts</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UpcomingPredictions({
  rounds,
  onGoToPredictions,
}: {
  rounds: RoundWithMatches[];
  onGoToPredictions: () => void;
}) {
  const upcoming = useMemo(() => {
    const matches = [];
    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.is_prediction_open) {
          matches.push({ match: m, roundName: r.round.name });
        }
      }
    }
    return matches
      .sort((a, b) => (a.match.scheduled_at ?? '').localeCompare(b.match.scheduled_at ?? ''))
      .slice(0, 4);
  }, [rounds]);

  const totalOpen = useMemo(() => {
    let n = 0;
    for (const r of rounds) for (const m of r.matches) if (m.is_prediction_open) n++;
    return n;
  }, [rounds]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Clock className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Próximos pronósticos</h3>
        {totalOpen > 0 && (
          <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
            {totalOpen}
          </span>
        )}
      </div>

      {totalOpen === 0 ? (
        <div className="flex items-center gap-2 px-4 py-5 text-center justify-center">
          <CalendarCheck className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-slate-400">
            {rounds.length === 0
              ? 'El calendario no está disponible aún.'
              : '¡Todos los partidos disponibles están pronosticados!'}
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-800/50">
            {upcoming.map(({ match, roundName }) => {
              const hasPrediction = match.my_prediction !== null;
              return (
                <div key={match.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {match.home_team?.flag_url && (
                        <img src={match.home_team.flag_url} alt="" className="w-4 h-3 object-cover rounded-[2px] shrink-0" />
                      )}
                      <span className="text-xs font-medium text-white truncate">
                        {match.home_team?.short_name ?? '?'}
                      </span>
                      <span className="text-slate-600 text-[10px]">vs</span>
                      <span className="text-xs font-medium text-white truncate">
                        {match.away_team?.short_name ?? '?'}
                      </span>
                      {match.away_team?.flag_url && (
                        <img src={match.away_team.flag_url} alt="" className="w-4 h-3 object-cover rounded-[2px] shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formatMatchDate(match.scheduled_at)} · {roundName}
                    </p>
                  </div>
                  {hasPrediction ? (
                    <span className="text-[10px] font-medium text-emerald-500 shrink-0">
                      {match.my_prediction!.home_score}–{match.my_prediction!.away_score} ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-500/80 shrink-0">
                      sin pronóstico
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={onGoToPredictions}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 border-t border-slate-800/50 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            Ver todos los pronósticos
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function RecentResults({
  rounds,
  currentUserId,
}: {
  rounds: RoundWithMatches[];
  currentUserId?: number;
}) {
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
      .sort((a, b) => (b.match.scheduled_at ?? '').localeCompare(a.match.scheduled_at ?? ''))
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
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Target className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Mis últimos resultados</h3>
        {totalEarned > 0 && (
          <span className="ml-auto text-[10px] text-slate-500">
            Total: <span className="font-bold text-white">{totalEarned}</span> pts
          </span>
        )}
      </div>

      {recentWithPrediction.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-5 px-4">
          Aún no hay partidos finalizados con tus pronósticos.
        </p>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {recentWithPrediction.map(({ match, roundName }) => {
            const pred = match.my_prediction!;
            const res = match.result!;
            return (
              <div key={match.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Teams + official result */}
                  <div className="flex items-center gap-1.5">
                    {match.home_team?.flag_url && (
                      <img src={match.home_team.flag_url} alt="" className="w-4 h-3 object-cover rounded-[2px] shrink-0" />
                    )}
                    <span className="text-xs font-medium text-white">
                      {match.home_team?.short_name ?? '?'}
                    </span>
                    <span className="text-xs font-bold text-white font-mono px-1">
                      {res.home_score}–{res.away_score}
                    </span>
                    <span className="text-xs font-medium text-white">
                      {match.away_team?.short_name ?? '?'}
                    </span>
                    {match.away_team?.flag_url && (
                      <img src={match.away_team.flag_url} alt="" className="w-4 h-3 object-cover rounded-[2px] shrink-0" />
                    )}
                  </div>
                  {/* My prediction */}
                  <p className="text-[10px] text-slate-500">
                    Mi pronóstico:{' '}
                    <span className="font-mono text-slate-400">
                      {pred.home_score}–{pred.away_score}
                    </span>
                    {' · '}
                    {roundName}
                  </p>
                </div>
                <PointsBadge points={pred.points} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface Props {
  standings: Standing[];
  rounds: RoundWithMatches[];
  currentUserId?: number;
  onGoToPredictions: () => void;
}

export function QuinielaDashboard({ standings, rounds, currentUserId, onGoToPredictions }: Props) {
  const myStanding = standings.find((s) => s.user.id === currentUserId);
  const leader = standings[0] ?? null;

  if (standings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trophy className="h-12 w-12 text-slate-700 mb-4" />
        <p className="text-slate-400 text-sm font-medium">Aún no hay participantes</p>
        <p className="text-slate-600 text-xs mt-1">El dashboard aparecerá cuando haya datos disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* My stats — full width */}
      {myStanding && (
        <MyStatsCard myStanding={myStanding} leader={leader} />
      )}

      {/* Two-column layout on md+ */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: Leaderboard */}
        <LeaderboardSection standings={standings} currentUserId={currentUserId} />

        {/* Right: Upcoming + Recent stacked */}
        <div className="space-y-4">
          <UpcomingPredictions rounds={rounds} onGoToPredictions={onGoToPredictions} />
          <RecentResults rounds={rounds} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}

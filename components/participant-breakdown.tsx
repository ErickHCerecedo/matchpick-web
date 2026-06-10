'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatMatchDate } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Standing, ApiResponse, ParticipantBreakdownData, BreakdownMatch } from '@/types';
import {
  ArrowLeft,
  Trophy,
  Target,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronRight,
  Minus,
  Crown,
  X,
} from 'lucide-react';

// ── Points badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: BreakdownMatch['score'] }) {
  if (!score) return null;
  if (score.points === 3) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
        <Target className="h-3 w-3" /> +3
      </span>
    );
  }
  if (score.points === 1) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
        <CheckCircle2 className="h-3 w-3" /> +1
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 shrink-0">
      <X className="h-3 w-3" /> 0
    </span>
  );
}

function BreakdownPill({ score }: { score: BreakdownMatch['score'] }) {
  if (!score) return null;
  const { result, exact } = score.breakdown;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <span
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded font-medium',
          result === 1 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-600'
        )}
      >
        {result === 1 ? '+1 resultado' : '−1 resultado'}
      </span>
      <span className="text-slate-700 text-[10px]">·</span>
      <span
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded font-medium',
          exact === 2 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-600'
        )}
      >
        {exact === 2 ? '+2 exacto' : '−2 exacto'}
      </span>
    </div>
  );
}

// ── Match row ─────────────────────────────────────────────────────────────────

function MatchRow({ match }: { match: BreakdownMatch }) {
  const isFuture = !match.has_started;

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden transition-all',
        match.status === 'in_progress'
          ? 'border-emerald-500/30'
          : match.status === 'finished'
          ? 'border-slate-700/60'
          : 'border-slate-800'
      )}
    >
      <div className={cn('p-3.5', isFuture && 'select-none')}>
        {/* Date row */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] text-slate-600">{formatMatchDate(match.scheduled_at)}</span>
          {match.status === 'in_progress' && (
            <span className="text-[10px] font-semibold text-emerald-400 tracking-wide">🔴 EN VIVO</span>
          )}
          {match.status === 'finished' && (
            <span className="text-[10px] text-slate-600 tracking-wide">Finalizado</span>
          )}
          {isFuture && (
            <span className="flex items-center gap-1 text-[10px] text-slate-700">
              <Lock className="h-2.5 w-2.5" />
              Pendiente
            </span>
          )}
        </div>

        {/* Teams + official result */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {match.home_team?.flag_url && (
              <img
                src={match.home_team.flag_url}
                alt=""
                className="w-5 h-3.5 object-cover rounded-xs shrink-0"
              />
            )}
            <span className="text-sm font-medium text-white truncate">
              {match.home_team?.name ?? 'TBD'}
            </span>
          </div>

          <div className="shrink-0 text-center min-w-13">
            {match.result ? (
              <span className="font-bold text-white text-base font-mono">
                {match.result.home_score} – {match.result.away_score}
              </span>
            ) : (
              <span className="text-slate-600 text-xs font-medium">vs</span>
            )}
          </div>

          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className="text-sm font-medium text-white truncate text-right">
              {match.away_team?.name ?? 'TBD'}
            </span>
            {match.away_team?.flag_url && (
              <img
                src={match.away_team.flag_url}
                alt=""
                className="w-5 h-3.5 object-cover rounded-xs shrink-0"
              />
            )}
          </div>
        </div>

        {/* Prediction + breakdown — blurred for future matches */}
        <div className={cn('mt-3 pt-3 border-t border-slate-800/70', isFuture && 'blur-sm pointer-events-none')}>
          {isFuture ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Pronóstico: — – —</span>
            </div>
          ) : match.prediction ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Pronóstico:</span>
                  <span className="text-xs font-bold font-mono text-slate-300">
                    {match.prediction.home_score} – {match.prediction.away_score}
                  </span>
                </div>
                {match.score && <BreakdownPill score={match.score} />}
              </div>
              <ScoreBadge score={match.score} />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Minus className="h-3 w-3 text-slate-600" />
              <span className="text-xs text-slate-600">Sin pronóstico</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Round section ─────────────────────────────────────────────────────────────

function RoundSection({
  name,
  matches,
  defaultOpen,
}: {
  name: string;
  matches: BreakdownMatch[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const startedCount = matches.filter((m) => m.has_started).length;
  const totalPts = matches.reduce((sum, m) => sum + (m.score?.points ?? 0), 0);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-2.5 group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors truncate">
            {name}
          </span>
          {startedCount > 0 && (
            <span className="text-[10px] text-slate-600">
              {startedCount}/{matches.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {startedCount > 0 && (
            <span className="text-xs font-bold text-emerald-400">{totalPts} pts</span>
          )}
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pb-3">
              {matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

function BreakdownDetail({
  quinielaSlug,
  userId,
  onBack,
}: {
  quinielaSlug: string;
  userId: number;
  onBack: () => void;
}) {
  const [data, setData] = useState<ParticipantBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<ApiResponse<ParticipantBreakdownData>>(
        `/quinielas/${quinielaSlug}/participants/${userId}/breakdown`
      )
      .then((res) => setData(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar desglose'))
      .finally(() => setLoading(false));
  }, [quinielaSlug, userId]);

  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Back header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-5 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Participantes</span>
      </button>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl bg-slate-800" />
          <Skeleton className="h-4 w-32 bg-slate-800 rounded" />
          <Skeleton className="h-24 rounded-xl bg-slate-800" />
          <Skeleton className="h-24 rounded-xl bg-slate-800" />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center py-10">{error}</p>
      )}

      {data && (
        <div className="space-y-5">
          {/* User header card */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-900 p-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-11 w-11">
                <AvatarImage src={data.user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-slate-700 text-white text-sm font-bold">
                  {data.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-white">{data.user.name}</p>
                <p className="text-xs text-slate-500">Desglose de puntos</p>
              </div>
            </div>

            {data.standing ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-800/70 px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Trophy className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total</span>
                  </div>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {data.standing.total_points}
                  </p>
                  <p className="text-[10px] text-slate-600">puntos</p>
                </div>
                <div className="rounded-lg bg-slate-800/70 px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Exactos</span>
                  </div>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {data.standing.exact_scores}
                  </p>
                  <p className="text-[10px] text-slate-600">marcadores</p>
                </div>
                <div className="rounded-lg bg-slate-800/70 px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Correctos</span>
                  </div>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {data.standing.correct_results}
                  </p>
                  <p className="text-[10px] text-slate-600">resultados</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs text-center">Sin estadísticas aún.</p>
            )}
          </div>

          {/* Points formula legend */}
          <div className="flex items-center gap-3 flex-wrap px-0.5">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">🎯 +3</span>
              marcador exacto
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">✓ +1</span>
              resultado correcto
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">✗ 0</span>
              incorrecto
            </span>
          </div>

          {/* Rounds */}
          <div className="divide-y divide-slate-800/60">
            {data.rounds
              .filter((r) => r.matches.length > 0)
              .map((r, idx) => (
                <RoundSection
                  key={r.round.id}
                  name={r.round.name}
                  matches={r.matches}
                  defaultOpen={idx === 0 || r.matches.some((m) => m.has_started)}
                />
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400 shrink-0" />;
  if (rank === 2) return <Crown className="h-5 w-5 text-slate-300 shrink-0" />;
  if (rank === 3) return <Crown className="h-5 w-5 text-amber-600 shrink-0" />;
  return <span className="text-xs font-medium text-slate-600 tabular-nums shrink-0">{rank}</span>;
}

// ── Main exported component ───────────────────────────────────────────────────

interface Props {
  quinielaSlug: string;
  standings: Standing[];
  currentUserId?: number;
  invitePanel?: React.ReactNode;
}

export function ParticipantBreakdown({ quinielaSlug, standings, currentUserId, invitePanel }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  return (
    <div>
      <AnimatePresence mode="wait">
        {selectedUserId === null ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.15 }}
          >
            {invitePanel && <div className="mb-4">{invitePanel}</div>}

            {/* Points info card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">Cómo se calculan los puntos</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-2.5 flex flex-col items-center gap-1">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <span className="text-base font-bold text-emerald-400 tabular-nums leading-tight">+3</span>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">Marcador exacto</span>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-2.5 flex flex-col items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <span className="text-base font-bold text-blue-400 tabular-nums leading-tight">+1</span>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">Resultado correcto</span>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-2.5 flex flex-col items-center gap-1">
                  <X className="h-4 w-4 text-slate-600" />
                  <span className="text-base font-bold text-slate-600 tabular-nums leading-tight">0</span>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">Incorrecto</span>
                </div>
              </div>
            </div>

            {standings.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">
                Aún no hay participantes.
              </p>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                {/* Table header */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-900/60 border-b border-slate-800">
                  <span className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center">
                    #
                  </span>
                  <span className="flex-1 min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Participante
                  </span>
                  <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center hidden sm:flex sm:items-center sm:justify-center sm:gap-1">
                    <Target className="h-3 w-3" /> Exactas
                  </span>
                  <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center hidden sm:flex sm:items-center sm:justify-center sm:gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Correctas
                  </span>
                  <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center hidden sm:block">
                    % Aciertos
                  </span>
                  <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">
                    Puntaje
                  </span>
                  <span className="w-4 shrink-0" />
                </div>

                {/* Rows */}
                {standings.map((s) => {
                  const isMe = s.user.id === currentUserId;
                  const accuracy =
                    s.predictions_made > 0
                      ? Math.round(((s.exact_scores + s.correct_results) / s.predictions_made) * 100)
                      : null;

                  return (
                    <motion.button
                      key={s.user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: s.rank * 0.04 }}
                      onClick={() => setSelectedUserId(s.user.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-3 border-b border-slate-800/60 last:border-b-0 transition-all text-left group',
                        isMe ? 'bg-emerald-500/5 hover:bg-emerald-500/[0.08]' : 'hover:bg-slate-900/50'
                      )}
                    >
                      <span className="w-8 shrink-0 flex justify-center">
                        <RankBadge rank={s.rank} />
                      </span>

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-slate-700/40">
                          <AvatarImage src={s.user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                            {s.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn('text-sm font-semibold truncate leading-none', isMe ? 'text-emerald-400' : 'text-white')}>
                              {s.user.name}
                            </span>
                            {isMe && (
                              <span className="text-[9px] font-bold text-emerald-500/60 bg-emerald-500/10 px-1 py-0.5 rounded shrink-0">
                                TÚ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop columns */}
                      <span className="w-12 shrink-0 text-center hidden sm:block">
                        <span className="text-sm font-bold text-white tabular-nums">{s.exact_scores}</span>
                      </span>
                      <span className="w-14 shrink-0 text-center hidden sm:block">
                        <span className="text-sm font-bold text-white tabular-nums">{s.correct_results}</span>
                      </span>
                      <span className="w-12 shrink-0 text-center hidden sm:block">
                        <span className="text-sm text-slate-400 tabular-nums">
                          {accuracy !== null ? `${accuracy}%` : '—'}
                        </span>
                      </span>

                      {/* Score — highlighted */}
                      <span className={cn(
                        'w-14 shrink-0 text-right text-base font-bold tabular-nums',
                        isMe ? 'text-emerald-400' : s.rank === 1 ? 'text-yellow-400' : 'text-white'
                      )}>
                        {s.total_points}
                      </span>

                      <ChevronRight className="w-4 h-4 shrink-0 text-slate-700 group-hover:text-slate-500 transition-colors" />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key={`detail-${selectedUserId}`}>
            <BreakdownDetail
              quinielaSlug={quinielaSlug}
              userId={selectedUserId}
              onBack={() => setSelectedUserId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  HelpCircle,
  BookOpen,
  Clock,
  Eye,
  Zap,
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

// ── Rules modal ───────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    label: 'Marcador exacto',
    prediction: '2 – 1',
    result: '2 – 1',
    points: 3,
    icon: Target,
    color: 'emerald' as const,
    desc: 'Predijiste el marcador exacto del partido. ¡La mejor predicción posible!',
  },
  {
    label: 'Resultado correcto',
    prediction: '3 – 1',
    result: '2 – 1',
    points: 1,
    icon: CheckCircle2,
    color: 'blue' as const,
    desc: 'Predijiste el ganador pero no el marcador exacto. ¡Sigue sumando!',
  },
  {
    label: 'Incorrecto',
    prediction: '0 – 2',
    result: '2 – 1',
    points: 0,
    icon: X,
    color: 'slate' as const,
    desc: 'El resultado no coincidió con tu predicción. ¡Más suerte la próxima!',
  },
];

function RulesModal({ onClose }: { onClose: () => void }) {
  const [activeScenario, setActiveScenario] = useState(0);
  const s = SCENARIOS[activeScenario];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pb-16 sm:pb-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full sm:max-w-lg max-h-[calc(100dvh-4.5rem)] sm:max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <BookOpen className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white">Reglas de la Quiniela</h2>
            <p className="text-xs text-slate-500">Aprende a ganar puntos y dominar el juego</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-6">

            {/* ── 1. Points system ── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Sistema de puntos</h3>
              </div>

              {/* Scenario tabs */}
              <div className="grid grid-cols-3 gap-2">
                {SCENARIOS.map((sc, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveScenario(i)}
                    className={cn(
                      'py-2 px-1.5 rounded-xl border text-[10px] font-bold transition-all text-center leading-tight',
                      activeScenario === i
                        ? sc.color === 'emerald'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : sc.color === 'blue'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-slate-800 border-slate-600 text-slate-300'
                        : 'border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                    )}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              {/* Active scenario card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScenario}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'rounded-xl border p-4 space-y-4',
                    s.color === 'emerald'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : s.color === 'blue'
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-slate-800 bg-slate-900/40'
                  )}
                >
                  {/* Score comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Tu pronóstico</p>
                      <p className="text-2xl font-bold text-white tabular-nums font-mono">{s.prediction}</p>
                    </div>
                    <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Resultado</p>
                      <p className="text-2xl font-bold text-white tabular-nums font-mono">{s.result}</p>
                    </div>
                  </div>

                  {/* Result row */}
                  <div className="flex items-center gap-3 pt-1">
                    <s.icon className={cn(
                      'h-4 w-4 shrink-0',
                      s.color === 'emerald' ? 'text-emerald-400' : s.color === 'blue' ? 'text-blue-400' : 'text-slate-600'
                    )} />
                    <p className="flex-1 text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                    <span className={cn(
                      'text-3xl font-black tabular-nums shrink-0',
                      s.color === 'emerald' ? 'text-emerald-400' : s.color === 'blue' ? 'text-blue-400' : 'text-slate-700'
                    )}>
                      +{s.points}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Quick reference */}
              <div className="grid grid-cols-3 gap-2">
                {SCENARIOS.map((sc, i) => (
                  <div key={i} className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-2 flex items-center gap-1.5">
                    <sc.icon className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      sc.color === 'emerald' ? 'text-emerald-400' : sc.color === 'blue' ? 'text-blue-400' : 'text-slate-600'
                    )} />
                    <span className={cn(
                      'text-sm font-black tabular-nums',
                      sc.color === 'emerald' ? 'text-emerald-400' : sc.color === 'blue' ? 'text-blue-400' : 'text-slate-600'
                    )}>
                      +{sc.points}
                    </span>
                    <span className="text-[10px] text-slate-600 truncate">{sc.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 2. When to predict ── */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Cuándo pronosticar</h3>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Tus predicciones se cierran{' '}
                  <span className="text-amber-400 font-semibold">automáticamente</span>{' '}
                  cuando el partido comienza. ¡No te quedes sin pronosticar!
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider">consejo</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
                <p className="text-xs text-slate-500">
                  Revisa el calendario y anticipa tus predicciones para no perderte ningún partido.
                </p>
              </div>
            </section>

            {/* ── 3. Transparency ── */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Transparencia</h3>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Las predicciones de otros participantes son{' '}
                  <span className="text-blue-400 font-semibold">visibles</span>{' '}
                  solo después de que el partido haya iniciado. Esto garantiza que nadie copie tus pronósticos.
                </p>
              </div>
            </section>

            {/* ── 4. How to win ── */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white">Cómo ganar</h3>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <p className="text-sm text-slate-300 leading-relaxed">
                  El participante con{' '}
                  <span className="text-yellow-400 font-semibold">más puntos</span>{' '}
                  al finalizar el torneo gana la quiniela.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-800/80 p-3 text-center">
                    <p className="text-2xl font-black text-emerald-400 tabular-nums">+3</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">marcador exacto</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/80 p-3 text-center">
                    <p className="text-2xl font-black text-blue-400 tabular-nums">+1</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">resultado correcto</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </motion.div>
    </div>
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
  const [showRules, setShowRules] = useState(false);

  return (
    <div>
      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>

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

            {/* FAQ trigger */}
            <button
              onClick={() => setShowRules(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900 transition-all group mb-4"
            >
              <div className="p-1.5 rounded-lg bg-slate-800 shrink-0 group-hover:bg-emerald-500/10 transition-colors">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <span className="flex-1 text-sm text-slate-400 text-left group-hover:text-white transition-colors">
                ¿Cómo se calculan los puntos y reglas de la quiniela?
              </span>
              <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </button>

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
                  <div className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-600 text-center leading-tight hidden sm:flex sm:flex-col sm:items-center sm:gap-0.5">
                    <Target className="h-3 w-3 text-emerald-600" />
                    <span>Marcador</span>
                    <span>Exacto</span>
                  </div>
                  <div className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-600 text-center leading-tight hidden sm:flex sm:flex-col sm:items-center sm:gap-0.5">
                    <CheckCircle2 className="h-3 w-3 text-blue-700" />
                    <span>Resultado</span>
                    <span>Correcto</span>
                  </div>
                  <div className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-600 text-center leading-tight hidden sm:flex sm:flex-col sm:items-center sm:gap-0.5">
                    <span>%</span>
                    <span>Aciertos</span>
                  </div>
                  <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">
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
                      <span className="w-20 shrink-0 text-center hidden sm:block">
                        <span className="text-sm font-bold text-white tabular-nums">{s.exact_scores}</span>
                      </span>
                      <span className="w-20 shrink-0 text-center hidden sm:block">
                        <span className="text-sm font-bold text-white tabular-nums">{s.correct_results}</span>
                      </span>
                      <span className="w-16 shrink-0 text-center hidden sm:block">
                        <span className="text-sm text-slate-400 tabular-nums">
                          {accuracy !== null ? `${accuracy}%` : '—'}
                        </span>
                      </span>

                      {/* Score — highlighted */}
                      <span className={cn(
                        'w-16 shrink-0 text-right text-xl font-bold tabular-nums',
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

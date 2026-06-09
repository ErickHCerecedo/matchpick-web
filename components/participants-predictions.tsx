'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatMatchDate } from '@/lib/utils';
import { groupByDate, formatDateLabel, toLocalDateKey, todayKey } from '@/lib/date-utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { RoundWithMatches, Prediction, ApiResponse, Match } from '@/types';
import { Lock, Eye, ChevronDown, RefreshCw, Pencil, Check } from 'lucide-react';

interface Props {
  quinielaSlug: string;
  rounds: RoundWithMatches[];
  currentUserId?: number;
  isAdmin?: boolean;
  isTournamentCustom?: boolean;
  onResultUpdated?: () => void;
}

function pointsBadge(points: number | null | undefined) {
  if (points === 3) return { cls: 'bg-emerald-500/20 text-emerald-400', label: '+3' };
  if (points === 1) return { cls: 'bg-slate-700 text-slate-400', label: '+1' };
  if (points === 0) return { cls: 'bg-slate-800 text-slate-600', label: '0' };
  return null;
}

// ── Inline result form ─────────────────────────────────────────────────────

function ResultForm({
  match,
  quinielaSlug,
  onSaved,
}: {
  match: Match;
  quinielaSlug: string;
  onSaved: () => void;
}) {
  const [home, setHome] = useState(match.result?.home_score?.toString() ?? '');
  const [away, setAway] = useState(match.result?.away_score?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a)) { toast.error('Ingresa marcadores válidos'); return; }
    setSaving(true);
    try {
      const res = await api.post<{ message: string }>(
        `/quinielas/${quinielaSlug}/matches/${match.id}/result`,
        { home_score: h, away_score: a }
      );
      toast.success(res.message ?? 'Resultado guardado');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar resultado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-t border-slate-800">
      <span className="text-xs text-slate-400 shrink-0">
        {match.result ? 'Editar resultado:' : 'Ingresar resultado:'}
      </span>
      <Input
        type="number" min="0" max="99" value={home}
        onChange={(e) => setHome(e.target.value.replace(/\D/g, ''))}
        className="w-14 h-8 text-center bg-slate-950 border-slate-700 text-white text-sm p-1"
        placeholder="0"
      />
      <span className="text-slate-500 font-bold text-sm">–</span>
      <Input
        type="number" min="0" max="99" value={away}
        onChange={(e) => setAway(e.target.value.replace(/\D/g, ''))}
        className="w-14 h-8 text-center bg-slate-950 border-slate-700 text-white text-sm p-1"
        placeholder="0"
      />
      <Button
        size="sm" onClick={handleSave}
        disabled={saving || home === '' || away === ''}
        className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 ml-1"
      >
        {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        <span className="ml-1">Guardar</span>
      </Button>
    </div>
  );
}

// ── Match card ─────────────────────────────────────────────────────────────

function MatchResultCard({
  match,
  quinielaSlug,
  currentUserId,
  isAdmin,
  onResultUpdated,
  showTeamColors,
}: {
  match: Match;
  quinielaSlug: string;
  currentUserId?: number;
  isAdmin?: boolean;
  onResultUpdated?: () => void;
  showTeamColors?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResultForm, setShowResultForm] = useState(false);

  const matchHasStarted = new Date(match.scheduled_at) <= new Date();

  const handleToggle = useCallback(async () => {
    if (!matchHasStarted) return;
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (predictions !== null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<Prediction[]>>(
        `/quinielas/${quinielaSlug}/predictions/${match.id}`
      );
      setPredictions(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pronósticos');
      setExpanded(false);
    } finally {
      setLoading(false);
    }
  }, [expanded, matchHasStarted, predictions, quinielaSlug, match.id]);

  const handleResultSaved = useCallback(() => {
    setShowResultForm(false);
    setPredictions(null);
    onResultUpdated?.();
  }, [onResultUpdated]);

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden relative bg-slate-900',
        match.status === 'in_progress'
          ? 'border-emerald-500/40'
          : match.status === 'finished'
          ? 'border-slate-800'
          : 'border-slate-800/60'
      )}
    >
      {/* Flag background */}
      {showTeamColors && (
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
          {match.home_team?.flag_url && (
            <img
              src={match.home_team.flag_url}
              alt=""
              className="absolute inset-y-0 left-0 w-1/2 h-full object-cover"
              style={{ filter: 'blur(8px) saturate(2.5) brightness(0.35)', transform: 'scale(1.15)', opacity: 0.95 }}
            />
          )}
          {match.away_team?.flag_url && (
            <img
              src={match.away_team.flag_url}
              alt=""
              className="absolute inset-y-0 right-0 w-1/2 h-full object-cover"
              style={{ filter: 'blur(8px) saturate(2.5) brightness(0.35)', transform: 'scale(1.15)', opacity: 0.95 }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-slate-950/20 via-slate-950/65 to-slate-950/20" />
        </div>
      )}

      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={!matchHasStarted}
        className={cn(
          'relative z-10 w-full p-4 text-left transition-colors',
          matchHasStarted ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'
        )}
      >
        {/* Status row */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className="text-xs text-slate-500">{formatMatchDate(match.scheduled_at)}</span>
          <div className="flex items-center gap-2">
            {match.status === 'in_progress' && (
              <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-xs">
                🔴 En vivo
              </Badge>
            )}
            {match.status === 'finished' && (
              <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs">
                Finalizado
              </Badge>
            )}
            {matchHasStarted ? (
              <ChevronDown
                className={cn('h-4 w-4 text-slate-500 transition-transform', expanded && 'rotate-180')}
              />
            ) : (
              <Lock className="h-3.5 w-3.5 text-slate-700" />
            )}
          </div>
        </div>

        {/* Teams + score — grid for equal space, names wrap on mobile */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col gap-1.5">
            {match.home_team?.flag_url && (
              <img src={match.home_team.flag_url} alt="" className="w-8 h-5 sm:w-10 sm:h-7 object-cover rounded shadow-sm" />
            )}
            <span className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2">
              {match.home_team?.name ?? 'TBD'}
            </span>
          </div>

          <div className="flex items-center justify-center px-1">
            {match.result ? (
              <span className="font-bold text-white text-base font-mono">
                {match.result.home_score} – {match.result.away_score}
              </span>
            ) : (
              <span className="text-slate-500 text-sm font-medium">vs</span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {match.away_team?.flag_url && (
              <img src={match.away_team.flag_url} alt="" className="w-8 h-5 sm:w-10 sm:h-7 object-cover rounded shadow-sm" />
            )}
            <span className="text-xs sm:text-sm font-semibold text-white text-right leading-tight line-clamp-2">
              {match.away_team?.name ?? 'TBD'}
            </span>
          </div>
        </div>

        {!matchHasStarted && (
          <p className="text-xs text-slate-700 mt-2.5 flex items-center gap-1.5">
            <Lock className="h-3 w-3 shrink-0" />
            Los pronósticos se revelan cuando inicia el partido
          </p>
        )}
        {matchHasStarted && !expanded && predictions === null && (
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Eye className="h-3 w-3 shrink-0" />
            Ver pronósticos de los participantes
          </p>
        )}
      </button>

      {/* Admin result toggle */}
      {isAdmin && matchHasStarted && (
        <div className="relative z-10 flex justify-end px-4 py-2 border-t border-slate-800/50">
          <button
            onClick={() => setShowResultForm((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {match.result ? 'Editar resultado' : 'Ingresar resultado'}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isAdmin && showResultForm && (
          <motion.div
            key="result-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <ResultForm match={match} quinielaSlug={quinielaSlug} onSaved={handleResultSaved} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded predictions */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="predictions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-800">
              {loading && (
                <div className="p-3 space-y-2">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 bg-slate-800 rounded-lg" />)}
                </div>
              )}
              {error && <p className="p-3 text-xs text-red-400 text-center">{error}</p>}
              {predictions && predictions.length === 0 && (
                <p className="p-4 text-xs text-slate-500 text-center">
                  Nadie hizo su pronóstico para este partido.
                </p>
              )}
              {predictions && predictions.length > 0 && (
                <div className="divide-y divide-slate-800/60">
                  {match.result && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/40">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
                        Resultado oficial
                      </span>
                      <span className="flex-1" />
                      <span className="text-sm font-bold font-mono text-white">
                        {match.home_team?.short_name ?? 'LOC'}
                      </span>
                      <span className="text-lg font-bold font-mono text-emerald-400 px-1">
                        {match.result.home_score} – {match.result.away_score}
                      </span>
                      <span className="text-sm font-bold font-mono text-white">
                        {match.away_team?.short_name ?? 'VIS'}
                      </span>
                    </div>
                  )}
                  {predictions.map((pred) => {
                    const pts = pointsBadge(pred.points);
                    const isMe = pred.user?.id === currentUserId;
                    return (
                      <div
                        key={pred.id}
                        className={cn('flex items-center gap-3 px-4 py-2.5', isMe ? 'bg-emerald-500/5' : '')}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={pred.user?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-slate-800 text-white text-[10px]">
                            {pred.user?.name?.charAt(0).toUpperCase() ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn('flex-1 text-xs font-medium truncate', isMe ? 'text-emerald-400' : 'text-slate-300')}>
                          {pred.user?.name ?? 'Usuario'}
                          {isMe && <span className="ml-1 text-[10px] text-emerald-500/60"> (tú)</span>}
                        </span>
                        <span className="text-xs font-mono text-white shrink-0">
                          {pred.home_score} – {pred.away_score}
                        </span>
                        {pts && (
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ml-1', pts.cls)}>
                            {pts.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom team color strip */}
      {showTeamColors && (
        <div className="relative z-10 h-1.5 flex" aria-hidden>
          <div className="flex-1 overflow-hidden">
            {match.home_team?.flag_url && (
              <img
                src={match.home_team.flag_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'saturate(2.5) brightness(1.1)', opacity: 0.85 }}
              />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {match.away_team?.flag_url && (
              <img
                src={match.away_team.flag_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'saturate(2.5) brightness(1.1)', opacity: 0.85 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ParticipantsPredictions({
  quinielaSlug,
  rounds,
  currentUserId,
  isAdmin,
  isTournamentCustom,
  onResultUpdated,
}: Props) {
  const matchesByDate = useMemo(() => groupByDate(rounds), [rounds]);
  const sortedDateKeys = useMemo(() => [...matchesByDate.keys()], [matchesByDate]);

  const [activeDateKey, setActiveDateKey] = useState<string | null>(() => {
    if (sortedDateKeys.length === 0) return null;
    const today = todayKey();
    // Start on today if it has matches, otherwise last past date, otherwise first date
    if (sortedDateKeys.includes(today)) return today;
    const pastDates = sortedDateKeys.filter((k) => k <= today);
    return pastDates[pastDates.length - 1] ?? sortedDateKeys[0];
  });

  const activeDateRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeDateKey]);

  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{ data: { synced: number }; message: string }>(
        `/quinielas/${quinielaSlug}/sync-results`,
        {}
      );
      toast.success(res.message);
      if (res.data.synced > 0) onResultUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // Date stats for the strip
  const dateStats = useMemo(() => {
    const stats = new Map<string, { total: number; withResult: number }>();
    for (const [dk, entries] of matchesByDate) {
      stats.set(dk, {
        total: entries.length,
        withResult: entries.filter((e) => e.match.result !== null).length,
      });
    }
    return stats;
  }, [matchesByDate]);

  // Matches for the active date, grouped by round name
  const activeDateMatchGroups = useMemo(() => {
    if (!activeDateKey) return [];
    const entries = matchesByDate.get(activeDateKey) ?? [];
    const grouped = new Map<string, Match[]>();
    for (const e of entries) {
      if (!grouped.has(e.roundName)) grouped.set(e.roundName, []);
      grouped.get(e.roundName)!.push(e.match);
    }
    return [...grouped.entries()];
  }, [matchesByDate, activeDateKey]);

  if (rounds.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-12">
        Aún no hay partidos disponibles.
      </p>
    );
  }

  const today = todayKey();

  return (
    <div className="space-y-4">
      {/* Admin toolbar — only for custom tournaments; non-custom sync from tournament page */}
      {isAdmin && isTournamentCustom !== false && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <p className="text-xs text-slate-500">
            Sincroniza con API-Football o ingresa resultados por partido.
          </p>
          <Button
            size="sm" variant="outline" onClick={handleSync} disabled={syncing}
            className="border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500 shrink-0"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando…' : 'Sincronizar API'}
          </Button>
        </div>
      )}

      {/* Date strip */}
      {sortedDateKeys.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {sortedDateKeys.map((dk) => {
            const { weekday, day, month } = formatDateLabel(dk);
            const stat = dateStats.get(dk)!;
            const isActive = activeDateKey === dk;
            const isToday = dk === today;
            const isFuture = dk > today;
            const isComplete = stat.total > 0 && stat.withResult === stat.total;
            const isPartial = stat.withResult > 0 && stat.withResult < stat.total;

            return (
              <button
                key={dk}
                ref={isActive ? activeDateRef : undefined}
                onClick={() => setActiveDateKey(dk)}
                className={cn(
                  'shrink-0 flex flex-col items-center px-3.5 py-3 rounded-xl border text-center min-w-15.5 transition-all duration-150',
                  isActive
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : isComplete
                    ? 'border-emerald-800/60 text-emerald-600 hover:border-emerald-600 hover:text-emerald-400'
                    : isToday
                    ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10'
                    : isFuture
                    ? 'border-slate-800/60 text-slate-700 hover:border-slate-700 hover:text-slate-500'
                    : 'border-slate-700/70 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-white'
                )}
              >
                <span className={cn('text-[10px] uppercase tracking-wide leading-none mb-1 font-semibold', isActive ? 'text-white/80' : '')}>
                  {isToday ? 'Hoy' : weekday}
                </span>
                <span className="text-xl font-bold leading-none">{day}</span>
                <span className={cn('text-[10px] uppercase tracking-wide leading-none mt-1', isActive ? 'text-white/70' : '')}>
                  {month}
                </span>
                {/* Result indicator */}
                <span className={cn('text-[9px] font-semibold mt-1.5 leading-none tabular-nums', isActive ? 'text-white/60' : isComplete ? 'text-emerald-500' : isPartial ? 'text-slate-500' : 'text-slate-700')}>
                  {isComplete ? '✓' : stat.withResult > 0 ? `${stat.withResult}/${stat.total}` : `${stat.total} ptdos`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Match cards */}
      <AnimatePresence mode="wait">
        {activeDateMatchGroups.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-slate-500 text-sm text-center py-8"
          >
            Selecciona una fecha.
          </motion.p>
        ) : (
          <motion.div
            key={activeDateKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {activeDateMatchGroups.map(([roundName, matches]) => (
              <div key={roundName} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest shrink-0 px-1">
                    {roundName}
                  </span>
                  <span className="h-px flex-1 bg-slate-800" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {matches.map((match) => (
                    <MatchResultCard
                      key={match.id}
                      match={match}
                      quinielaSlug={quinielaSlug}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      onResultUpdated={onResultUpdated}
                      showTeamColors
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

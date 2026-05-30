'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatMatchDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { RoundWithMatches, Prediction, ApiResponse, Match } from '@/types';
import { Lock, Eye, ChevronDown, RefreshCw, Pencil, Check, Layers, Swords } from 'lucide-react';

interface Props {
  quinielaSlug: string;
  rounds: RoundWithMatches[];
  currentUserId?: number;
  isAdmin?: boolean;
  onResultUpdated?: () => void;
}

function pointsBadge(points: number | null | undefined) {
  if (points === 3) return { cls: 'bg-emerald-500/20 text-emerald-400', label: '🎯 +3' };
  if (points === 1) return { cls: 'bg-blue-500/20 text-blue-400', label: '✓ +1' };
  if (points === 0) return { cls: 'bg-slate-800 text-slate-500', label: '✗ 0' };
  return null;
}

// ── Inline result form for admins ─────────────────────────────────────────────

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
    if (isNaN(h) || isNaN(a)) {
      toast.error('Ingresa marcadores válidos');
      return;
    }
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
    <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/40 border-t border-slate-700">
      <span className="text-xs text-slate-400 shrink-0">
        {match.result ? 'Editar:' : 'Resultado:'}
      </span>
      <Input
        type="number"
        min="0"
        max="99"
        value={home}
        onChange={(e) => setHome(e.target.value.replace(/\D/g, ''))}
        className="w-14 h-8 text-center bg-slate-800 border-slate-600 text-white text-sm p-1"
        placeholder="0"
      />
      <span className="text-slate-500 font-bold text-sm">–</span>
      <Input
        type="number"
        min="0"
        max="99"
        value={away}
        onChange={(e) => setAway(e.target.value.replace(/\D/g, ''))}
        className="w-14 h-8 text-center bg-slate-800 border-slate-600 text-white text-sm p-1"
        placeholder="0"
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || home === '' || away === ''}
        className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 ml-1"
      >
        {saving ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        <span className="ml-1">Guardar</span>
      </Button>
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchPredictionsCard({
  match,
  quinielaSlug,
  currentUserId,
  isAdmin,
  onResultUpdated,
}: {
  match: Match;
  quinielaSlug: string;
  currentUserId?: number;
  isAdmin?: boolean;
  onResultUpdated?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResultForm, setShowResultForm] = useState(false);

  const matchHasStarted = new Date(match.scheduled_at) <= new Date();

  const handleToggle = useCallback(async () => {
    if (!matchHasStarted) return;

    if (expanded) {
      setExpanded(false);
      return;
    }

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
    setPredictions(null); // force reload of predictions with new points
    onResultUpdated?.();
  }, [onResultUpdated]);

  const borderClass =
    match.status === 'in_progress'
      ? 'border-emerald-500/40'
      : match.status === 'finished'
      ? 'border-slate-700'
      : 'border-slate-800';

  return (
    <div className={cn('rounded-xl border overflow-hidden', borderClass)}>
      {/* Match header */}
      <button
        onClick={handleToggle}
        disabled={!matchHasStarted}
        className={cn(
          'w-full p-4 bg-slate-900 text-left transition-colors',
          matchHasStarted ? 'cursor-pointer hover:bg-slate-800/70' : 'cursor-default'
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className="text-xs text-slate-500">{formatMatchDate(match.scheduled_at)}</span>
          <div className="flex items-center gap-2">
            {match.status === 'in_progress' && (
              <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-xs">
                🔴 En vivo
              </Badge>
            )}
            {match.status === 'finished' && (
              <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                Finalizado
              </Badge>
            )}
            {matchHasStarted ? (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-500 transition-transform',
                  expanded && 'rotate-180'
                )}
              />
            ) : (
              <Lock className="h-3.5 w-3.5 text-slate-600" />
            )}
          </div>
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {match.home_team?.flag_url && (
              <img
                src={match.home_team.flag_url}
                alt={match.home_team.short_name}
                className="w-6 h-4 object-cover rounded-sm shrink-0"
              />
            )}
            <span className="text-sm font-medium text-white truncate">
              {match.home_team?.name ?? 'TBD'}
            </span>
          </div>

          {match.result ? (
            <span className="font-bold text-white text-base font-mono shrink-0">
              {match.result.home_score} – {match.result.away_score}
            </span>
          ) : (
            <span className="text-slate-500 text-sm shrink-0 font-medium">vs</span>
          )}

          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className="text-sm font-medium text-white truncate text-right">
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

        {!matchHasStarted && (
          <p className="text-xs text-slate-600 mt-2.5 flex items-center gap-1.5">
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

      {/* Admin: result entry/edit button */}
      {isAdmin && matchHasStarted && (
        <div className="flex justify-end px-4 py-2 bg-slate-900 border-t border-slate-800/60">
          <button
            onClick={() => setShowResultForm((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {match.result ? 'Editar resultado' : 'Ingresar resultado'}
          </button>
        </div>
      )}

      {/* Admin: inline result form */}
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
            <ResultForm
              match={match}
              quinielaSlug={quinielaSlug}
              onSaved={handleResultSaved}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded predictions list */}
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
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-9 bg-slate-800 rounded-lg" />
                  ))}
                </div>
              )}

              {error && (
                <p className="p-3 text-xs text-red-400 text-center">{error}</p>
              )}

              {predictions && predictions.length === 0 && (
                <p className="p-4 text-xs text-slate-500 text-center">
                  Nadie hizo su pronóstico para este partido.
                </p>
              )}

              {predictions && predictions.length > 0 && (
                <div className="divide-y divide-slate-800/60">
                  {/* Official result banner */}
                  {match.result && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
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
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5',
                          isMe ? 'bg-emerald-500/5' : ''
                        )}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={pred.user?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-slate-700 text-white text-[10px]">
                            {pred.user?.name?.charAt(0).toUpperCase() ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'flex-1 text-xs font-medium truncate',
                            isMe ? 'text-emerald-400' : 'text-slate-300'
                          )}
                        >
                          {pred.user?.name ?? 'Usuario'}
                          {isMe && (
                            <span className="ml-1 text-[10px] text-emerald-500/60"> (tú)</span>
                          )}
                        </span>
                        <span className="text-xs font-mono text-white shrink-0">
                          {pred.home_score} – {pred.away_score}
                        </span>
                        {pts && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ml-1',
                              pts.cls
                            )}
                          >
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
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ParticipantsPredictions({ quinielaSlug, rounds, currentUserId, isAdmin, onResultUpdated }: Props) {
  const [activeRoundId, setActiveRoundId] = useState<number | null>(
    () =>
      rounds.find((r) => r.matches.some((m) => new Date(m.scheduled_at) <= new Date()))
        ?.round.id ?? rounds[0]?.round.id ?? null
  );
  const [syncing, setSyncing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const activeRound = rounds.find((r) => r.round.id === activeRoundId);
  const groupRounds = rounds.filter((r) => r.round.type === 'group');
  const knockoutRounds = rounds.filter((r) => r.round.type !== 'group');
  const activeRoundHasStarted = activeRound?.matches.some(
    (m) => new Date(m.scheduled_at) <= new Date()
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{ data: { synced: number }; message: string }>(
        `/quinielas/${quinielaSlug}/sync-results`,
        {}
      );
      toast.success(res.message);
      if (res.data.synced > 0) {
        onResultUpdated?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  if (rounds.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-12">
        Aún no hay partidos disponibles.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin toolbar */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">
            Sincroniza con API-Football o ingresa resultados manualmente por partido.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="border-slate-600 text-slate-300 hover:text-white hover:border-emerald-500 shrink-0"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando…' : 'Sincronizar API'}
          </Button>
        </div>
      )}

      {/* Round selector — dropdown */}
      {rounds.length > 1 && (
        <div className="relative z-10" ref={dropdownRef}>
          {/* Trigger */}
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className={cn(
              'flex items-center justify-between gap-3 w-full px-4 py-3 rounded-xl bg-slate-900 border transition-colors text-left',
              dropdownOpen
                ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                : 'border-slate-700 hover:border-slate-600'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                Jornada
              </span>
              <span className="text-sm font-semibold text-white truncate">
                {activeRound?.round.name ?? 'Seleccionar'}
              </span>
              {activeRoundHasStarted && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0',
                dropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Panel */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
              >
                <div className="max-h-72 overflow-y-auto py-1">
                  {groupRounds.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
                        <Layers className="h-3 w-3 text-slate-600" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          Fase de Grupos
                        </span>
                      </div>
                      {groupRounds.map((r) => {
                        const hasStarted = r.matches.some((m) => new Date(m.scheduled_at) <= new Date());
                        const isActive = activeRoundId === r.round.id;
                        return (
                          <button
                            key={r.round.id}
                            onClick={() => { setActiveRoundId(r.round.id); setDropdownOpen(false); }}
                            className={cn(
                              'flex items-center justify-between gap-3 w-full px-4 py-2.5 text-sm transition-colors',
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            )}
                          >
                            <span className="font-medium">{r.round.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {hasStarted && !isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              )}
                              {isActive && <Check className="h-3.5 w-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {groupRounds.length > 0 && knockoutRounds.length > 0 && (
                    <div className="mx-3 my-1.5 border-t border-slate-800" />
                  )}

                  {knockoutRounds.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
                        <Swords className="h-3 w-3 text-slate-600" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          Fase Eliminatoria
                        </span>
                      </div>
                      {knockoutRounds.map((r) => {
                        const hasStarted = r.matches.some((m) => new Date(m.scheduled_at) <= new Date());
                        const isActive = activeRoundId === r.round.id;
                        return (
                          <button
                            key={r.round.id}
                            onClick={() => { setActiveRoundId(r.round.id); setDropdownOpen(false); }}
                            className={cn(
                              'flex items-center justify-between gap-3 w-full px-4 py-2.5 text-sm transition-colors',
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            )}
                          >
                            <span className="font-medium">{r.round.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {hasStarted && !isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              )}
                              {isActive && <Check className="h-3.5 w-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Match cards */}
      {activeRound ? (
        <div className="space-y-2">
          {rounds.length === 1 && (
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              {activeRound.round.name}
            </p>
          )}
          {activeRound.matches.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Sin partidos en esta jornada.</p>
          ) : (
            activeRound.matches.map((match) => (
              <MatchPredictionsCard
                key={match.id}
                match={match}
                quinielaSlug={quinielaSlug}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onResultUpdated={onResultUpdated}
              />
            ))
          )}
        </div>
      ) : (
        <p className="text-slate-500 text-sm text-center py-8">Selecciona una jornada.</p>
      )}
    </div>
  );
}

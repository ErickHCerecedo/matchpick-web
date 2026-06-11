'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MatchCard } from '@/components/match-card';
import { TeamStandings } from '@/components/team-standings';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ApiResponse, Match, Tournament, RoundWithMatches, TeamStandingsData } from '@/types';
import { CalendarDays, Trophy, RefreshCw, GitBranch, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  groupByDate,
  formatDateLabel,
  formatFullDate,
  todayKey,
  toLocalDateKey,
} from '@/lib/date-utils';

// ── constants ──────────────────────────────────────────────────────────────

const ROUND_TYPE_ORDER = [
  'group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final', 'general',
] as const;

const ROUND_ORDER_MAP = new Map(ROUND_TYPE_ORDER.map((t, i) => [t, i]));

const KNOCKOUT_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'] as const;

const KNOCKOUT_LABELS: Record<string, { label: string; abbr: string }> = {
  round_of_32: { label: '32avos de Final',  abbr: '32avos'    },
  round_of_16: { label: '16avos de Final',  abbr: '16avos'    },
  quarter:     { label: 'Cuartos de Final', abbr: 'Cuartos'   },
  semi:        { label: 'Semifinales',      abbr: 'Semis'     },
  third_place: { label: 'Tercer Lugar',     abbr: '3er lugar' },
  final:       { label: 'Gran Final',       abbr: 'Final'     },
};

// ── component ──────────────────────────────────────────────────────────────

export default function TorneoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [teamStandings, setTeamStandings] = useState<TeamStandingsData | null>(null);
  const [loadingTeamStandings, setLoadingTeamStandings] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const activeDateRef = useRef<HTMLButtonElement>(null);
  const standingsFetched = useRef(false);

  useEffect(() => {
    activeDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeDateKey]);

  useEffect(() => {
    if (!slug) return;

    api.get<ApiResponse<Tournament>>(`/tournaments/${slug}`)
      .then((res) => setTournament(res.data))
      .catch(console.error)
      .finally(() => setLoadingTournament(false));

    api.get<ApiResponse<RoundWithMatches[]>>(`/tournaments/${slug}/matches`)
      .then((res) => {
        setRounds(res.data);
        const today = todayKey();
        const allMatches = res.data.flatMap((r) => r.matches);
        const allDates = [
          ...new Set(
            allMatches
              .map((m) => (m.scheduled_at ? toLocalDateKey(m.scheduled_at) : null))
              .filter(Boolean) as string[]
          ),
        ].sort();
        const defaultDate = allDates.find((d) => d >= today) ?? allDates[0];
        if (defaultDate) setActiveDateKey(defaultDate);
      })
      .catch(console.error);
  }, [slug]);

  const handleSync = async () => {
    if (!tournament) return;
    setSyncing(true);
    try {
      const res = await api.post<{ message: string }>(`/admin/tournaments/${tournament.slug}/sync-results`, {});
      toast.success(res.message ?? 'Resultados sincronizados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'standings' && !standingsFetched.current && slug) {
      standingsFetched.current = true;
      setLoadingTeamStandings(true);
      api.get<ApiResponse<TeamStandingsData>>(`/tournaments/${slug}/team-standings`)
        .then((res) => setTeamStandings(res.data))
        .catch(console.error)
        .finally(() => setLoadingTeamStandings(false));
    }
  };

  const sortedRounds = useMemo(
    () =>
      [...rounds].sort(
        (a, b) =>
          (ROUND_ORDER_MAP.get(a.round.type as typeof ROUND_TYPE_ORDER[number]) ?? 99) -
          (ROUND_ORDER_MAP.get(b.round.type as typeof ROUND_TYPE_ORDER[number]) ?? 99)
      ),
    [rounds]
  );

  const dateGroups = useMemo(() => groupByDate(sortedRounds), [sortedRounds]);
  const sortedDateKeys = useMemo(() => [...dateGroups.keys()], [dateGroups]);

  const activeDateMatches = useMemo(() => {
    if (!activeDateKey) return [];
    const entries = dateGroups.get(activeDateKey) ?? [];
    const grouped = new Map<string, Match[]>();
    for (const e of entries) {
      if (!grouped.has(e.roundName)) grouped.set(e.roundName, []);
      grouped.get(e.roundName)!.push(e.match);
    }
    return [...grouped.entries()];
  }, [dateGroups, activeDateKey]);

  // ── loading / error states ────────────────────────────────────────────────

  if (loadingTournament) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full rounded-xl bg-slate-800" />
        <Skeleton className="h-10 w-full rounded-xl bg-slate-800" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-17 rounded-xl bg-slate-800 shrink-0" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!tournament) {
    return <p className="text-slate-400">Torneo no encontrado.</p>;
  }

  const today = todayKey();
  const hasToday = sortedDateKeys.includes(today);
  const isActive = tournament.is_active;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

      {/* ── Tournament hero ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {tournament.logo_url && (
            <img
              src={tournament.logo_url}
              alt={tournament.name}
              className="w-10 h-10 object-contain shrink-0 drop-shadow"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white leading-tight truncate">
                {tournament.name}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-xs font-semibold',
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-600 bg-slate-800/50 text-slate-400'
                )}
              >
                {isActive ? '● En curso' : 'Finalizado'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span>
                {new Date(tournament.starts_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {' — '}
                {new Date(tournament.ends_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {user?.is_admin && !tournament.is_custom && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando…' : 'Sincronizar resultados'}
          </button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid! grid-cols-3 w-full h-auto! bg-slate-900 border border-slate-700/60 p-1 gap-1 rounded-xl">
          <TabsTrigger
            value="calendar"
            className="flex items-center justify-center gap-2 py-2.5 h-auto rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-medium">Calendario</span>
          </TabsTrigger>
          <TabsTrigger
            value="standings"
            className="flex items-center justify-center gap-2 py-2.5 h-auto rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium">Clasificación</span>
          </TabsTrigger>
          <TabsTrigger
            value="bracket"
            className="flex items-center justify-center gap-2 py-2.5 h-auto rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            <span className="text-xs font-medium">Eliminatoria</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Calendar tab ─────────────────────────────────────────── */}
        <TabsContent value="calendar" className="space-y-4 mt-4">

          {/* "Ir a hoy" shortcut */}
          {hasToday && activeDateKey !== today && (
            <div className="flex justify-end">
              <button
                onClick={() => setActiveDateKey(today)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center gap-1"
              >
                Ir a hoy
                <span aria-hidden>→</span>
              </button>
            </div>
          )}

          {/* Date strip */}
          {sortedDateKeys.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {sortedDateKeys.map((dateKey) => {
                const { weekday, day, month } = formatDateLabel(dateKey);
                const isActiveDate = activeDateKey === dateKey;
                const isToday = dateKey === today;
                const count = dateGroups.get(dateKey)!.length;
                return (
                  <button
                    key={dateKey}
                    ref={isActiveDate ? activeDateRef : undefined}
                    onClick={() => setActiveDateKey(dateKey)}
                    className={cn(
                      'shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border text-center min-w-15.5 transition-all',
                      isActiveDate
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : isToday
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wide leading-none mb-1 font-semibold">
                      {isToday ? 'Hoy' : weekday}
                    </span>
                    <span className="text-xl font-bold leading-none">{day}</span>
                    <span className="text-[10px] uppercase tracking-wide leading-none mt-1">
                      {month}
                    </span>
                    <span className={cn('text-[9px] font-semibold mt-2 leading-none tabular-nums', isActiveDate ? 'text-emerald-300/70' : 'text-slate-600')}>
                      {count} {count === 1 ? 'ptdo' : 'ptdos'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Match list */}
          <AnimatePresence mode="wait">
            {sortedDateKeys.length === 0 ? (
              <motion.div key="empty-calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyCalendar message="El calendario aún no está disponible." />
              </motion.div>
            ) : activeDateMatches.length === 0 ? (
              <motion.div key="no-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyCalendar message="Selecciona una fecha para ver los partidos." />
              </motion.div>
            ) : (
              <motion.div
                key={activeDateKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {activeDateKey && (
                  <p className="text-sm text-slate-500 capitalize">
                    {formatFullDate(activeDateKey)}
                  </p>
                )}

                {activeDateMatches.map(([roundName, matches]) => (
                  <div key={roundName} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-slate-800" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest shrink-0 px-1">
                        {roundName}
                      </span>
                      <span className="h-px flex-1 bg-slate-800" />
                    </div>
                    {matches.map((match) => (
                      <MatchCard key={match.id} match={match} prediction={null} readOnly />
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* ── Standings tab ────────────────────────────────────────── */}
        <TabsContent value="standings" className="mt-4">
          <TeamStandings data={teamStandings} loading={loadingTeamStandings} />
        </TabsContent>

        {/* ── Bracket tab ──────────────────────────────────────────── */}
        <TabsContent value="bracket" className="mt-4">
          <BracketTab rounds={sortedRounds} />
        </TabsContent>
      </Tabs>

    </motion.div>
  );
}

// ── sub-components ──────────────────────────────────────────────────────────

function EmptyCalendar({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
      <CalendarDays className="h-10 w-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Bracket components ───────────────────────────────────────────────────────

function BracketMatchCard({ match, isFinal = false }: { match: Match; isFinal?: boolean }) {
  const isFinished = match.status === 'finished';
  const inProgress = match.status === 'in_progress';
  const homeWon = isFinished && match.result?.winner === 'home';
  const awayWon = isFinished && match.result?.winner === 'away';

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden bg-slate-950',
      isFinal ? 'border-amber-500/40 shadow-lg shadow-amber-500/10' : 'border-slate-800'
    )}>
      {/* Home team */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3.5 transition-colors',
        homeWon && 'bg-emerald-500/8',
        awayWon && 'opacity-35'
      )}>
        <div className="w-7 shrink-0 flex justify-center">
          {match.home_team?.flag_url
            ? <img src={match.home_team.flag_url} alt="" className="w-7 h-5 object-cover rounded-sm" />
            : <div className="w-5 h-5 rounded-full bg-slate-800" />
          }
        </div>
        <span className={cn(
          'flex-1 text-sm font-semibold truncate',
          homeWon ? 'text-white' : isFinished ? 'text-slate-400' : 'text-slate-200'
        )}>
          {match.home_team?.name ?? <span className="text-slate-600 italic text-xs">Por definir</span>}
        </span>
        {(isFinished || inProgress) && (
          <span className={cn(
            'text-2xl font-black tabular-nums font-mono shrink-0 min-w-6 text-right',
            homeWon ? 'text-white' : 'text-slate-500'
          )}>
            {match.result?.home_score ?? '–'}
          </span>
        )}
        <div className={cn('w-0.5 h-5 rounded-full shrink-0 transition-colors', homeWon ? 'bg-emerald-500' : 'bg-transparent')} />
      </div>

      <div className="h-px bg-slate-800 mx-4" />

      {/* Away team */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3.5 transition-colors',
        awayWon && 'bg-emerald-500/8',
        homeWon && 'opacity-35'
      )}>
        <div className="w-7 shrink-0 flex justify-center">
          {match.away_team?.flag_url
            ? <img src={match.away_team.flag_url} alt="" className="w-7 h-5 object-cover rounded-sm" />
            : <div className="w-5 h-5 rounded-full bg-slate-800" />
          }
        </div>
        <span className={cn(
          'flex-1 text-sm font-semibold truncate',
          awayWon ? 'text-white' : isFinished ? 'text-slate-400' : 'text-slate-200'
        )}>
          {match.away_team?.name ?? <span className="text-slate-600 italic text-xs">Por definir</span>}
        </span>
        {(isFinished || inProgress) && (
          <span className={cn(
            'text-2xl font-black tabular-nums font-mono shrink-0 min-w-6 text-right',
            awayWon ? 'text-white' : 'text-slate-500'
          )}>
            {match.result?.away_score ?? '–'}
          </span>
        )}
        <div className={cn('w-0.5 h-5 rounded-full shrink-0 transition-colors', awayWon ? 'bg-emerald-500' : 'bg-transparent')} />
      </div>

      {/* Footer */}
      <div className={cn(
        'px-4 py-2 border-t border-slate-800/60 flex items-center justify-between',
        isFinal && 'bg-amber-950/20'
      )}>
        <span className="text-[10px] text-slate-600 flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" />
          {new Date(match.scheduled_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          {' · '}
          {new Date(match.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {inProgress && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
            En vivo
          </span>
        )}
        {isFinished && <span className="text-[10px] text-slate-600">Finalizado</span>}
        {match.status === 'scheduled' && <span className="text-[10px] text-slate-600">Programado</span>}
      </div>
    </div>
  );
}

function BracketTab({ rounds }: { rounds: RoundWithMatches[] }) {
  const knockoutRounds = useMemo(() =>
    rounds
      .filter(r => (KNOCKOUT_ORDER as readonly string[]).includes(r.round.type))
      .sort((a, b) => KNOCKOUT_ORDER.indexOf(a.round.type as typeof KNOCKOUT_ORDER[number]) - KNOCKOUT_ORDER.indexOf(b.round.type as typeof KNOCKOUT_ORDER[number])),
    [rounds]
  );

  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);

  useEffect(() => {
    if (knockoutRounds.length === 0) return;
    const inProgress = knockoutRounds.find(r => r.matches.some(m => m.status === 'in_progress'));
    if (inProgress) { setActiveRoundId(inProgress.round.id); return; }
    const upcoming = knockoutRounds.find(r => r.matches.some(m => m.status === 'scheduled'));
    if (upcoming) { setActiveRoundId(upcoming.round.id); return; }
    setActiveRoundId(knockoutRounds[knockoutRounds.length - 1]?.round.id ?? null);
  }, [knockoutRounds]);

  const activeRound = knockoutRounds.find(r => r.round.id === activeRoundId);
  const isFinalRound = activeRound?.round.type === 'final';

  if (knockoutRounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <GitBranch className="h-10 w-10 text-slate-700 mx-auto" />
        </div>
        <p className="text-slate-500 text-sm font-medium">Fase eliminatoria no disponible</p>
        <p className="text-slate-700 text-xs">Aparecerá cuando el torneo avance a esta fase.</p>
      </div>
    );
  }

  const champion = isFinalRound && activeRound.matches[0]?.result
    ? activeRound.matches[0].result.winner === 'home'
      ? activeRound.matches[0].home_team?.name
      : activeRound.matches[0].away_team?.name
    : null;

  return (
    <div className="space-y-4">

      {/* ── Round stepper ─────────────────────────────────────────── */}
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
        {knockoutRounds.map((r, idx) => {
          const meta = KNOCKOUT_LABELS[r.round.type];
          const isActive = activeRoundId === r.round.id;
          const allDone = r.matches.length > 0 && r.matches.every(m => m.status === 'finished');
          const isFinal = r.round.type === 'final';

          return (
            <div key={r.round.id} className="flex items-center shrink-0">
              <button
                onClick={() => setActiveRoundId(r.round.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all',
                  isActive && isFinal
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                    : isActive
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                    : allDone
                    ? 'border-slate-700/40 text-slate-500'
                    : 'border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                )}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {meta?.abbr ?? r.round.name}
                </span>
                <span className={cn('text-xs font-black tabular-nums', !isActive && 'text-slate-600')}>
                  {r.matches.length}
                </span>
                {allDone && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />}
              </button>
              {idx < knockoutRounds.length - 1 && (
                <ChevronRight className="h-3 w-3 text-slate-700 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Active round ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeRound && (
          <motion.div
            key={activeRoundId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Round header card */}
            <div className={cn(
              'rounded-xl p-4 border flex items-center gap-3',
              isFinalRound
                ? 'bg-gradient-to-r from-amber-950/70 via-amber-900/30 to-slate-950 border-amber-500/30'
                : 'bg-slate-900/70 border-slate-800'
            )}>
              <div className={cn(
                'rounded-xl p-2.5 border shrink-0',
                isFinalRound
                  ? 'bg-amber-500/15 border-amber-500/25'
                  : 'bg-emerald-500/10 border-emerald-500/20'
              )}>
                {isFinalRound
                  ? <Trophy className="h-5 w-5 text-amber-400" />
                  : <GitBranch className="h-4 w-4 text-emerald-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-bold text-base leading-tight',
                  isFinalRound ? 'text-amber-300' : 'text-white'
                )}>
                  {KNOCKOUT_LABELS[activeRound.round.type]?.label ?? activeRound.round.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeRound.matches.length} {activeRound.matches.length === 1 ? 'partido' : 'partidos'}
                  {' · '}
                  {activeRound.matches.filter(m => m.status === 'finished').length} finalizados
                </p>
              </div>
              {champion && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-amber-500/70 uppercase tracking-wide font-bold">Campeón</p>
                  <p className="text-sm font-bold text-amber-300 truncate max-w-24">{champion}</p>
                </div>
              )}
            </div>

            {/* Match grid */}
            <div className={cn(
              'grid gap-3',
              isFinalRound ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
            )}>
              {activeRound.matches.map(match => (
                <BracketMatchCard key={match.id} match={match} isFinal={isFinalRound} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

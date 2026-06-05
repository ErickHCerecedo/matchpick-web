'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchCard } from '@/components/match-card';
import {
  GlobalStandingsWidget,
  type GlobalStanding,
} from '@/components/global-standings-widget';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Match, Tournament, RoundWithMatches } from '@/types';
import { ArrowLeft, CalendarDays, Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

type MobileTab = 'calendar' | 'standings';

// ── component ──────────────────────────────────────────────────────────────

export default function TorneoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [globalStandings, setGlobalStandings] = useState<GlobalStanding[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('calendar');
  const activeDateRef = useRef<HTMLButtonElement>(null);

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

    api
      .get<ApiResponse<GlobalStanding[]>>(`/tournaments/${slug}/global-standings`)
      .then((res) => setGlobalStandings(res.data))
      .catch(console.error)
      .finally(() => setLoadingStandings(false));
  }, [slug]);

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
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-lg bg-slate-800 shrink-0" />
          <Skeleton className="h-24 flex-1 rounded-2xl bg-slate-800" />
        </div>
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
      <div className="flex items-start gap-3">
        <Link
          href="/torneos"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'text-slate-400 hover:text-white shrink-0 mt-1'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div
          className={cn(
            'flex-1 min-w-0 rounded-2xl border p-4 md:p-5',
            isActive
              ? 'bg-emerald-950/30 border-emerald-800/40'
              : 'bg-slate-900 border-slate-800'
          )}
        >
          <div className="flex items-start gap-4">
            {tournament.logo_url && (
              <img
                src={tournament.logo_url}
                alt={tournament.name}
                className="w-12 h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
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
              <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-500" />
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
        </div>
      </div>

      {/* ── Mobile tab switcher (hidden on lg+) ──────────────────────── */}
      <div className="flex lg:hidden bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setMobileTab('calendar')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            mobileTab === 'calendar'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Calendario
        </button>
        <button
          onClick={() => setMobileTab('standings')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            mobileTab === 'standings'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <Trophy className="h-4 w-4" />
          Clasificación
        </button>
      </div>

      {/* ── Main two-column layout ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-6 items-start">

        {/* ── Calendar column ─────────────────────────────────────────── */}
        <div className={cn('lg:col-span-2 space-y-4 min-w-0', mobileTab !== 'calendar' && 'hidden lg:block')}>

          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Calendario</h3>
            </div>
            {hasToday && activeDateKey !== today && (
              <button
                onClick={() => setActiveDateKey(today)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center gap-1"
              >
                Ir a hoy
                <span aria-hidden>→</span>
              </button>
            )}
          </div>

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
                      'shrink-0 flex flex-col items-center px-3.5 py-3 rounded-xl border text-center min-w-17 transition-all duration-150',
                      isActiveDate
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25'
                        : isToday
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10'
                        : 'border-slate-700/70 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-white hover:bg-slate-800/60'
                    )}
                  >
                    <span className={cn('text-[10px] uppercase tracking-wide leading-none mb-1 font-semibold', isActiveDate ? 'text-white/80' : '')}>
                      {isToday ? 'Hoy' : weekday}
                    </span>
                    <span className="text-xl font-bold leading-none">{day}</span>
                    <span className={cn('text-[10px] uppercase tracking-wide leading-none mt-1', isActiveDate ? 'text-white/70' : '')}>
                      {month}
                    </span>
                    <span className={cn('text-[9px] font-semibold mt-2 leading-none tabular-nums', isActiveDate ? 'text-white/60' : 'text-slate-600')}>
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
                {/* Full date heading */}
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
        </div>

        {/* ── Standings sidebar ────────────────────────────────────────── */}
        <div className={cn('min-w-0', mobileTab !== 'standings' && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-800/30">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Top 10 Global</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Ranking del torneo</p>
              </div>
            </div>
            {/* Card body */}
            <div className="p-3">
              <GlobalStandingsWidget
                standings={globalStandings}
                loading={loadingStandings}
                currentUserId={user?.id}
              />
            </div>
          </div>
        </div>

      </div>
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

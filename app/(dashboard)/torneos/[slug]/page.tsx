'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import { ArrowLeft, Calendar, Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── helpers ────────────────────────────────────────────────────────────────

type DateEntry = { match: Match; roundName: string };

function groupByDate(rounds: RoundWithMatches[]): Map<string, DateEntry[]> {
  const byDate = new Map<string, DateEntry[]>();
  for (const r of rounds) {
    for (const m of r.matches) {
      const key = m.scheduled_at?.slice(0, 10) ?? 'sin-fecha';
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push({ match: m, roundName: r.round.name });
    }
  }
  // sort chronologically
  return new Map([...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateKey: string) {
  const d = parseDateKey(dateKey);
  return {
    weekday: d.toLocaleDateString('es-MX', { weekday: 'short' }),
    day: d.getDate(),
    month: d.toLocaleDateString('es-MX', { month: 'short' }),
  };
}

// ── component ──────────────────────────────────────────────────────────────

const ROUND_TYPE_ORDER = [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter',
  'semi',
  'third_place',
  'final',
] as const;

export default function TorneoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [globalStandings, setGlobalStandings] = useState<GlobalStanding[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    api.get<ApiResponse<Tournament>>(`/tournaments/${slug}`)
      .then((tRes) => setTournament(tRes.data))
      .catch(console.error)
      .finally(() => setLoadingTournament(false));

    api.get<ApiResponse<RoundWithMatches[]>>(`/tournaments/${slug}/matches`)
      .then((mRes) => {
        setRounds(mRes.data);
        // Default: first date that has matches (from the first round)
        const sorted = [...mRes.data].sort(
          (a, b) =>
            ROUND_TYPE_ORDER.indexOf(a.round.type as typeof ROUND_TYPE_ORDER[number]) -
            ROUND_TYPE_ORDER.indexOf(b.round.type as typeof ROUND_TYPE_ORDER[number])
        );
        const firstRoundWithMatches = sorted.find((r) => r.matches.length > 0);
        if (firstRoundWithMatches) {
          const firstMatch = [...firstRoundWithMatches.matches].sort((a, b) =>
            (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')
          )[0];
          if (firstMatch?.scheduled_at) {
            setActiveDateKey(firstMatch.scheduled_at.slice(0, 10));
          }
        }
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
          ROUND_TYPE_ORDER.indexOf(a.round.type as typeof ROUND_TYPE_ORDER[number]) -
          ROUND_TYPE_ORDER.indexOf(b.round.type as typeof ROUND_TYPE_ORDER[number])
      ),
    [rounds]
  );

  const dateGroups = useMemo(() => groupByDate(sortedRounds), [sortedRounds]);
  const sortedDateKeys = useMemo(() => [...dateGroups.keys()], [dateGroups]);

  // Matches for active date, grouped by round name (preserving round order)
  const activeDateMatches = useMemo(() => {
    if (!activeDateKey) return [];
    const entries = dateGroups.get(activeDateKey) ?? [];
    // Group by roundName maintaining original order
    const grouped = new Map<string, Match[]>();
    for (const e of entries) {
      if (!grouped.has(e.roundName)) grouped.set(e.roundName, []);
      grouped.get(e.roundName)!.push(e.match);
    }
    return [...grouped.entries()];
  }, [dateGroups, activeDateKey]);

  if (loadingTournament) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 bg-slate-800" />
        <Skeleton className="h-48 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!tournament) {
    return <p className="text-slate-400">Torneo no encontrado.</p>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/torneos"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'text-slate-400 hover:text-white shrink-0'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-2xl font-bold text-white leading-tight">{tournament.name}</h2>
            <Badge
              variant="outline"
              className={
                tournament.is_active
                  ? 'border-emerald-500/50 text-emerald-400 shrink-0'
                  : 'border-slate-600 text-slate-500 shrink-0'
              }
            >
              {tournament.is_active ? 'En curso' : 'Finalizado'}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {new Date(tournament.starts_at).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              —{' '}
              {new Date(tournament.ends_at).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar (left/main) */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <h3 className="text-lg font-semibold text-white">Calendario</h3>

          {/* Date strip */}
          {sortedDateKeys.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-0.5 px-0.5">
              {sortedDateKeys.map((dateKey) => {
                const { weekday, day, month } = formatDateLabel(dateKey);
                const isActive = activeDateKey === dateKey;
                const count = dateGroups.get(dateKey)!.length;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setActiveDateKey(dateKey)}
                    className={cn(
                      'shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border text-center min-w-[62px] transition-all',
                      isActive
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wide leading-none mb-1">
                      {weekday}
                    </span>
                    <span className="text-xl font-bold leading-none">{day}</span>
                    <span className="text-[10px] uppercase tracking-wide leading-none mt-1">
                      {month}
                    </span>
                    <span
                      className={cn(
                        'text-[9px] font-medium mt-1.5 leading-none',
                        isActive ? 'text-emerald-400' : 'text-slate-600'
                      )}
                    >
                      {count} {count === 1 ? 'partido' : 'partidos'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Matches for selected date */}
          {sortedDateKeys.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              El calendario aún no está disponible.
            </p>
          ) : activeDateMatches.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              Selecciona una fecha para ver los partidos.
            </p>
          ) : (
            <div className="space-y-5">
              {activeDateMatches.map(([roundName, matches]) => (
                <div key={roundName} className="space-y-3">
                  {/* Round separator */}
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-slate-800" />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest shrink-0">
                      {roundName}
                    </span>
                    <span className="h-px flex-1 bg-slate-800" />
                  </div>
                  {matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={null}
                      readOnly
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global standings (right) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Top 10 Global</h3>
          </div>
          <p className="text-xs text-slate-500">
            Ranking por predicciones únicas en este torneo
          </p>
          <GlobalStandingsWidget
            standings={globalStandings}
            loading={loadingStandings}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </motion.div>
  );
}

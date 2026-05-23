'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchCard } from '@/components/match-card';
import {
  GlobalStandingsWidget,
  type GlobalStanding,
} from '@/components/global-standings-widget';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Tournament, RoundWithMatches } from '@/types';
import { ArrowLeft, Calendar, Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;

    api.get<ApiResponse<Tournament>>(`/tournaments/${slug}`)
      .then((tRes) => setTournament(tRes.data))
      .catch(console.error)
      .finally(() => setLoadingTournament(false));

    api.get<ApiResponse<RoundWithMatches[]>>(`/tournaments/${slug}/matches`)
      .then((mRes) => {
        setRounds(mRes.data);
        const firstRound = mRes.data.find((r) => r.matches.length > 0);
        if (firstRound) setActiveRoundId(firstRound.round.id);
      })
      .catch(console.error);

    api
      .get<ApiResponse<GlobalStanding[]>>(`/tournaments/${slug}/global-standings`)
      .then((res) => setGlobalStandings(res.data))
      .catch(console.error)
      .finally(() => setLoadingStandings(false));
  }, [slug]);

  const sortedRounds = [...rounds].sort(
    (a, b) =>
      ROUND_TYPE_ORDER.indexOf(a.round.type as typeof ROUND_TYPE_ORDER[number]) -
      ROUND_TYPE_ORDER.indexOf(b.round.type as typeof ROUND_TYPE_ORDER[number])
  );

  const activeRound = sortedRounds.find((r) => r.round.id === activeRoundId);

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
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white">Calendario</h3>

          {/* Round selector */}
          {sortedRounds.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {sortedRounds.map((r) => (
                <button
                  key={r.round.id}
                  onClick={() => setActiveRoundId(r.round.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    activeRoundId === r.round.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                  )}
                >
                  {r.round.name}
                </button>
              ))}
            </div>
          )}

          {/* Matches */}
          {sortedRounds.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              El calendario aún no está disponible.
            </p>
          ) : activeRound ? (
            <div className="space-y-3">
              {activeRound.matches.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  Sin partidos en esta jornada.
                </p>
              ) : (
                activeRound.matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={null}
                    readOnly
                  />
                ))
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">
              Selecciona una jornada.
            </p>
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

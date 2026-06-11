'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { QuinielaCard } from '@/components/quiniela-card';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';
import { api } from '@/lib/api';
import type { ApiResponse, Quiniela, LiveMatch } from '@/types';

function LiveMatchCard({ match }: { match: LiveMatch }) {
  const homeFlag = match.home_team?.flag_url;
  const awayFlag = match.away_team?.flag_url;
  return (
    <Link href={`/torneos/${match.tournament.slug}`}>
      <div className="shrink-0 w-52 rounded-xl bg-slate-900 border border-red-500/20 hover:border-red-500/40 transition-colors p-3 cursor-pointer">
        <div className="flex items-center gap-2">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            {homeFlag ? (
              <img src={homeFlag} alt="" className="w-9 h-6 object-cover rounded shadow-sm" />
            ) : (
              <FlagPlaceholder size="sm" />
            )}
            <span className="text-[10px] font-semibold text-white text-center leading-tight truncate w-full mt-0.5">
              {match.home_team?.name ?? match.home_placeholder ?? 'Local'}
            </span>
          </div>

          {/* Score */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            {match.result ? (
              <span className="text-lg font-bold text-white font-mono tabular-nums leading-none">
                {match.result.home_score}–{match.result.away_score}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded leading-none">
                0–0
              </span>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            {awayFlag ? (
              <img src={awayFlag} alt="" className="w-9 h-6 object-cover rounded shadow-sm" />
            ) : (
              <FlagPlaceholder size="sm" />
            )}
            <span className="text-[10px] font-semibold text-white text-center leading-tight truncate w-full mt-0.5">
              {match.away_team?.name ?? match.away_placeholder ?? 'Visitante'}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-2 truncate">{match.tournament.name}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [quinielas, setQuinielas] = useState<Quiniela[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<Quiniela[]>>('/quinielas'),
      api.get<ApiResponse<LiveMatch[]>>('/matches/live').catch(() => ({ data: [] as LiveMatch[] })),
    ])
      .then(([qRes, lRes]) => {
        setQuinielas(qRes.data);
        setLiveMatches(lRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Live matches banner */}
      {liveMatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
            <h3 className="text-sm font-bold text-red-400">Jugando ahora</h3>
            <span className="text-xs text-slate-500 ml-auto">
              {liveMatches.length} {liveMatches.length === 1 ? 'partido' : 'partidos'} en vivo
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {liveMatches.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Mis Quinielas</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {quinielas.length} quiniela{quinielas.length !== 1 ? 's' : ''} activa
            {quinielas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/quinielas/nueva" className={cn(buttonVariants(), 'bg-emerald-500 hover:bg-emerald-600 text-white')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-slate-800 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl bg-slate-800" />
            ))}
          </div>
        </div>
      ) : quinielas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Sin quinielas aún</h3>
          <p className="text-slate-400 text-sm mb-6">
            Crea tu primera quiniela o únete con un código de invitación
          </p>
          <Link href="/quinielas/nueva" className={cn(buttonVariants(), 'bg-emerald-500 hover:bg-emerald-600 text-white')}>
            <Plus className="h-4 w-4 mr-2" />
            Crear quiniela
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quinielas.map((quiniela, i) => (
            <QuinielaCard key={quiniela.id} quiniela={quiniela} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

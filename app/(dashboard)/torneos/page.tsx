'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TournamentLogo } from '@/components/tournament-logo';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Tournament, Quiniela } from '@/types';
import { Calendar, Plus, Settings } from 'lucide-react';

function TournamentCard({ tournament, index, isOwner }: { tournament: Tournament; index: number; isOwner: boolean }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <Link href={`/torneos/${tournament.slug}`}>
        <div className="h-full rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:border-emerald-500/40 hover:bg-slate-900/90">

          {/* ── Header: logo + name + controls ────────────────── */}
          <div className="flex items-start gap-3 min-w-0">
            <TournamentLogo tournament={tournament} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white leading-snug line-clamp-2 text-sm">
                  {tournament.name}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                  {isOwner && (
                    <button
                      onClick={(e) => { e.preventDefault(); router.push(`/torneos/${tournament.slug}/admin`); }}
                      className="p-1 rounded text-slate-500 hover:text-emerald-400 transition-colors"
                      title="Administrar torneo"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      tournament.is_active
                        ? 'text-[10px] border-emerald-500/50 text-emerald-400'
                        : 'text-[10px] border-slate-700 text-slate-500'
                    }
                  >
                    {tournament.is_active ? '● Activo' : 'Finalizado'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-1">
                <span className="capitalize">{tournament.type.replace('_', ' ')}</span>
                <span>·</span>
                <span>{tournament.season}</span>
                {tournament.is_custom && (
                  <>
                    <span>·</span>
                    <span className="text-violet-500">Custom</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Dates ─────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>
              {new Date(tournament.starts_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' — '}
              {new Date(tournament.ends_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

        </div>
      </Link>
    </motion.div>
  );
}

export default function TorneosPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [participatingIds, setParticipatingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<Tournament[]>>('/tournaments')
      .then((res) => setTournaments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    if (user) {
      api.get<ApiResponse<Tournament[]>>('/my-tournaments')
        .then((res) => setMyTournaments(res.data))
        .catch(console.error);

      api.get<ApiResponse<Quiniela[]>>('/quinielas')
        .then((res) => {
          setParticipatingIds(new Set(res.data.map((q) => q.tournament.id)));
        })
        .catch(console.error);
    }
  }, [user]);

  const myIds = useMemo(() => new Set(myTournaments.map((t) => t.id)), [myTournaments]);

  const allTournaments = useMemo(() => [
    // My own custom tournaments are always visible
    ...myTournaments,
    // From the public list: only tournaments the user is participating in (official or other's custom)
    ...tournaments.filter((t) => {
      if (myIds.has(t.id)) return false;
      return participatingIds.has(t.id);
    }),
  ], [myTournaments, tournaments, myIds, participatingIds]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Torneos</h2>
          <p className="text-slate-400 text-sm mt-0.5">Calendario y posiciones por torneo</p>
        </div>
        {user && (
          <Link href="/torneos/nuevo">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              <Plus className="h-4 w-4" />
              Crear torneo
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl bg-slate-800" />
          ))}
        </div>
      ) : allTournaments.length === 0 ? (
        <div className="text-center py-20">
          <div className="h-12 w-12 rounded-2xl bg-slate-800 mx-auto mb-4 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-slate-600" />
          </div>
          <p className="text-slate-400">No hay torneos disponibles.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allTournaments.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} index={i} isOwner={myIds.has(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

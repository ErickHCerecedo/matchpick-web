'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Tournament } from '@/types';
import { Calendar, Trophy, Plus, Settings } from 'lucide-react';

function TournamentCard({ tournament, index, isOwner }: { tournament: Tournament; index: number; isOwner: boolean }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Link href={`/torneos/${tournament.slug}`}>
        <Card className="bg-slate-900 border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white leading-tight">{tournament.name}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
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
                      ? 'border-emerald-500/50 text-emerald-400'
                      : 'border-slate-600 text-slate-500'
                  }
                >
                  {tournament.is_active ? 'Activo' : 'Finalizado'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(tournament.starts_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' — '}
                {new Date(tournament.ends_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <Trophy className="h-3 w-3" />
              <span className="capitalize">{tournament.type.replace('_', ' ')}</span>
              <span>·</span>
              <span>{tournament.season}</span>
              {tournament.is_custom && (
                <>
                  <span>·</span>
                  <span className="text-emerald-600">Custom</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function TorneosPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
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
    }
  }, [user]);

  const myIds = new Set(myTournaments.map((t) => t.id));
  const allTournaments = [
    ...myTournaments,
    ...tournaments.filter((t) => !myIds.has(t.id)),
  ];

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
            <Skeleton key={i} className="h-36 rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : allTournaments.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
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

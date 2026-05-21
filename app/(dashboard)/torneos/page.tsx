'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { ApiResponse, Tournament } from '@/types';
import { Calendar, Trophy } from 'lucide-react';

function TournamentCard({ tournament, index }: { tournament: Tournament; index: number }) {
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
              <Badge
                variant="outline"
                className={
                  tournament.is_active
                    ? 'border-emerald-500/50 text-emerald-400 shrink-0'
                    : 'border-slate-600 text-slate-500 shrink-0'
                }
              >
                {tournament.is_active ? 'Activo' : 'Finalizado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(tournament.starts_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                —{' '}
                {new Date(tournament.ends_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <Trophy className="h-3 w-3" />
              <span className="capitalize">{tournament.type.replace('_', ' ')}</span>
              <span>·</span>
              <span>{tournament.season}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<Tournament[]>>('/tournaments')
      .then((res) => setTournaments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Torneos</h2>
        <p className="text-slate-400 text-sm mt-0.5">Calendario y posiciones por torneo</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No hay torneos activos.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t, i) => (
            <TournamentCard key={t.id} tournament={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

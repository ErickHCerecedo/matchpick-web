'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { StandingsTable } from '@/components/standings-table';
import { PredictionForm } from '@/components/prediction-form';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Quiniela, Standing, RoundWithMatches, Prediction } from '@/types';
import { Lock, Globe, Users } from 'lucide-react';

export default function QuinielaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [quiniela, setQuiniela] = useState<Quiniela | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      api.get<ApiResponse<Quiniela>>(`/quinielas/${slug}`),
      api.get<ApiResponse<Standing[]>>(`/quinielas/${slug}/standings`),
      api.get<ApiResponse<RoundWithMatches[]>>(`/quinielas/${slug}/matches`),
    ])
      .then(([qRes, sRes, mRes]) => {
        setQuiniela(qRes.data);
        setStandings(sRes.data);
        setRounds(mRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <Skeleton className="h-64 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!quiniela) {
    return <p className="text-slate-400">Quiniela no encontrada.</p>;
  }

  const initialPredictions: Record<number, Prediction> = {};
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.my_prediction) {
        initialPredictions[match.id] = match.my_prediction;
      }
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">{quiniela.name}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{quiniela.tournament.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={
                quiniela.type === 'public'
                  ? 'border-emerald-500/50 text-emerald-400'
                  : 'border-slate-600 text-slate-400'
              }
            >
              {quiniela.type === 'public' ? (
                <><Globe className="h-3 w-3 mr-1" />Pública</>
              ) : (
                <><Lock className="h-3 w-3 mr-1" />Privada</>
              )}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-2">
          <Users className="h-3.5 w-3.5" />
          <span>{quiniela.participants_count} participantes</span>
        </div>
      </div>

      <Tabs defaultValue="standings">
        <TabsList className="bg-slate-800 border-slate-700 mb-6">
          <TabsTrigger value="standings" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Posiciones
          </TabsTrigger>
          <TabsTrigger value="predictions" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Predicciones
          </TabsTrigger>
          <TabsTrigger value="participants" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Participantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          <StandingsTable standings={standings} currentUserId={user?.id} />
        </TabsContent>

        <TabsContent value="predictions">
          {quiniela.predictions_open ? (
            <PredictionForm
              quinielaSlug={slug}
              rounds={rounds}
              initialPredictions={initialPredictions}
            />
          ) : (
            <p className="text-center text-slate-400 py-10">Las predicciones están cerradas.</p>
          )}
        </TabsContent>

        <TabsContent value="participants">
          <div className="space-y-3">
            {standings.map((s) => (
              <div key={s.user.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={s.user.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-slate-700 text-white text-xs">
                    {s.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium text-white">{s.user.name}</span>
                {s.user.id === user?.id && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">Tú</Badge>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StandingsTable } from '@/components/standings-table';
import { PredictionForm } from '@/components/prediction-form';
import { ParticipantsPredictions } from '@/components/participants-predictions';
import { ParticipantBreakdown } from '@/components/participant-breakdown';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Quiniela, Standing, RoundWithMatches, Prediction } from '@/types';
import {
  Lock, Globe, Users, Link2, Copy, Check, Loader2,
  Trophy, Target, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function QuinielaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [quiniela, setQuiniela] = useState<Quiniela | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateInvite = async () => {
    if (!slug) return;
    setGeneratingInvite(true);
    try {
      const res = await api.post<{ data: { token: string } }>(
        `/quinielas/${slug}/invitations`,
        {}
      );
      const link = `${window.location.origin}/invitaciones/${res.data.token}`;
      setInviteLink(link);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar invitación');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!slug) return;

    api.get<ApiResponse<Quiniela>>(`/quinielas/${slug}`)
      .then((res) => setQuiniela(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get<ApiResponse<Standing[]>>(`/quinielas/${slug}/standings`)
      .then((res) => setStandings(res.data))
      .catch(console.error);

    api.get<ApiResponse<RoundWithMatches[]>>(`/quinielas/${slug}/matches`)
      .then((res) => setRounds(res.data))
      .catch(console.error);
  }, [slug]);

  const refreshRoundsAndStandings = () => {
    if (!slug) return;
    api.get<ApiResponse<RoundWithMatches[]>>(`/quinielas/${slug}/matches`)
      .then((res) => setRounds(res.data))
      .catch(console.error);
    api.get<ApiResponse<Standing[]>>(`/quinielas/${slug}/standings`)
      .then((res) => setStandings(res.data))
      .catch(console.error);
  };

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
      <div className="mb-5">
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
        {/* Mobile-first: 2×2 grid on small screens, 4-col row on sm+ */}
        <TabsList className="!grid grid-cols-2 sm:grid-cols-4 w-full !h-auto bg-slate-800 border border-slate-700/60 mb-5 p-1 gap-1 rounded-xl">
          <TabsTrigger
            value="standings"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium">Posiciones</span>
          </TabsTrigger>
          <TabsTrigger
            value="predictions"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <Target className="h-4 w-4" />
            <span className="text-xs font-medium">Predicciones</span>
          </TabsTrigger>
          <TabsTrigger
            value="transparency"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs font-medium">Resultados</span>
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Participantes</span>
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

        <TabsContent value="transparency">
          <ParticipantsPredictions
            quinielaSlug={slug}
            rounds={rounds}
            currentUserId={user?.id}
            isAdmin={quiniela.my_role === 'admin'}
            onResultUpdated={refreshRoundsAndStandings}
          />
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantBreakdown
            quinielaSlug={slug}
            standings={standings}
            currentUserId={user?.id}
            invitePanel={
              quiniela.my_role === 'admin' ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                  <p className="text-sm font-medium text-white">Invitar participantes</p>
                  {inviteLink ? (
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={inviteLink}
                        className="flex-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-2 truncate focus:outline-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyLink}
                        className="border-slate-600 text-slate-300 hover:text-white shrink-0"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {generatingInvite ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Link2 className="h-4 w-4 mr-2" />
                      )}
                      Generar enlace de invitación
                    </Button>
                  )}
                  <p className="text-xs text-slate-500">El enlace expira en 7 días.</p>
                </div>
              ) : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

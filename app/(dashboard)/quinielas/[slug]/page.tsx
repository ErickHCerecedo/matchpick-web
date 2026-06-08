'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PredictionForm } from '@/components/prediction-form';
import { ParticipantsPredictions } from '@/components/participants-predictions';
import { ParticipantBreakdown } from '@/components/participant-breakdown';
import { QuinielaDashboard } from '@/components/quiniela-dashboard';
import { DeleteQuinielaDialog } from '@/components/delete-quiniela-dialog';
import { ShareQuinielaDialog } from '@/components/share-quiniela-dialog';
import { TournamentLogo } from '@/components/tournament-logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Quiniela, Standing, RoundWithMatches, Prediction } from '@/types';
import {
  Users, Link2, Copy, Check, Loader2,
  Target, ListChecks, LayoutDashboard,
  MoreVertical, Trash2, Share2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function QuinielaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [quiniela, setQuiniela] = useState<Quiniela | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDelete, setShowDelete] = useState(false);
  const [showShare, setShowShare] = useState(false);

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

    Promise.all([
      api.get<ApiResponse<Quiniela>>(`/quinielas/${slug}`),
      api.get<ApiResponse<Standing[]>>(`/quinielas/${slug}/standings`),
      api.get<ApiResponse<RoundWithMatches[]>>(`/quinielas/${slug}/matches`),
    ])
      .then(([qRes, sRes, rRes]) => {
        setQuiniela(qRes.data);
        setStandings(sRes.data);
        setRounds(rRes.data);
      })
      .catch(() => {
        setLoadError(true);
        toast.error('Error al cargar la quiniela. Intenta de nuevo.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handlePredictionsSaved = useCallback((saved: Record<number, Prediction>) => {
    setRounds(prev =>
      prev.map(r => ({
        ...r,
        matches: r.matches.map(m => {
          const p = saved[m.id];
          return p ? { ...m, my_prediction: p } : m;
        }),
      }))
    );
  }, []);

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

  if (loadError) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-sm">No se pudo cargar la quiniela.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!quiniela) {
    return <p className="text-slate-400">Quiniela no encontrada.</p>;
  }

  const isAdmin = quiniela.my_role === 'admin';
  const myStanding = standings.find((s) => s.user.id === user?.id) ?? null;

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
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <TournamentLogo tournament={quiniela.tournament} size="md" className="shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white leading-tight truncate">{quiniela.name}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-slate-400 text-xs truncate">{quiniela.tournament.name}</span>
              <span className="text-slate-700 text-xs shrink-0">·</span>
              <span className="flex items-center gap-1 text-slate-500 text-xs shrink-0">
                <Users className="h-3 w-3" />
                {quiniela.participants_count} participantes
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none shrink-0">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-slate-900 border-slate-800 text-slate-200 min-w-47.5"
          >
            <DropdownMenuItem
              onClick={() => setShowShare(true)}
              className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
            >
              <Share2 className="h-4 w-4 text-emerald-400" />
              Compartir mi posición
            </DropdownMenuItem>

            {isAdmin && (
              <>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={() => setShowDelete(true)}
                  className="gap-2 cursor-pointer text-red-400 hover:bg-red-950/40 focus:bg-red-950/40 hover:text-red-300 focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar quiniela
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Mobile-first: 2×2 grid on small screens, 4-col row on sm+ */}
        <TabsList className="!grid grid-cols-4 w-full !h-auto bg-slate-900 border border-slate-700/60 mb-5 p-1 gap-1 rounded-xl">
          <TabsTrigger
            value="dashboard"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-xs font-medium">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger
            value="predictions"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Target className="h-4 w-4" />
            <span className="text-xs font-medium">Predicciones</span>
          </TabsTrigger>
          <TabsTrigger
            value="transparency"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ListChecks className="h-4 w-4" />
            <span className="text-xs font-medium">Resultados</span>
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="flex flex-col items-center gap-1 py-2.5 h-auto rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Participantes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <QuinielaDashboard
            standings={standings}
            rounds={rounds}
            currentUserId={user?.id}
            totalParticipants={standings.length}
            onGoToPredictions={() => setActiveTab('predictions')}
            onShare={() => setShowShare(true)}
          />
        </TabsContent>

        <TabsContent value="predictions">
          {quiniela.predictions_open ? (
            <PredictionForm
              key={rounds.length > 0 ? 'loaded' : 'empty'}
              quinielaSlug={slug}
              rounds={rounds}
              initialPredictions={initialPredictions}
              onSaved={handlePredictionsSaved}
            />
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-slate-400">Las predicciones están cerradas.</p>
              <p className="text-slate-600 text-xs">Puedes ver los resultados en el tab Transparencia.</p>
            </div>
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
                        className="flex-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 text-xs px-3 py-2 truncate focus:outline-none"
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

      {/* Dialogs */}
      <DeleteQuinielaDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        quiniela={quiniela}
        isAdmin={isAdmin}
      />
      <ShareQuinielaDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        quiniela={quiniela}
        standing={myStanding}
      />
    </motion.div>
  );
}

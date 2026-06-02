'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ApiResponse, Quiniela, QuinielaDeleteStatus, Standing } from '@/types';
import {
  AlertTriangle,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  Vote,
} from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────

function deletionWindow(quiniela: Quiniela): 'pre_tournament' | 'post_tournament' | 'active' {
  const now = new Date();
  const starts = new Date(quiniela.tournament.starts_at);
  const ends = new Date(quiniela.tournament.ends_at);
  const fiveDays = 5 * 24 * 60 * 60 * 1000;
  if (now.getTime() + fiveDays < starts.getTime()) return 'pre_tournament';
  if (now.getTime() - fiveDays > ends.getTime()) return 'post_tournament';
  return 'active';
}

// ── sub-components ─────────────────────────────────────────────────────────

function DangerBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{children}</p>
    </div>
  );
}

// ── Free-delete panel (pre/post tournament) ────────────────────────────────

function FreeDeletePanel({
  quiniela,
  onDeleted,
  onClose,
}: {
  quiniela: Quiniela;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmed = typed === quiniela.name;
  const isPost = deletionWindow(quiniela) === 'post_tournament';

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    try {
      await api.delete(`/quinielas/${quiniela.slug}`);
      toast.success('Quiniela eliminada.');
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <DangerBanner>
        {isPost
          ? 'El torneo ya terminó hace más de 5 días. Esta acción es permanente e irreversible.'
          : 'El torneo aún no ha comenzado. Esta acción es permanente e irreversible.'}
      </DangerBanner>

      {/* Quiniela stats */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Se eliminará permanentemente
        </p>
        <p className="text-base font-semibold text-white">{quiniela.name}</p>
        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
          <Users className="h-3.5 w-3.5" />
          <span>{quiniela.participants_count} participantes perderán el acceso</span>
        </div>
        <p className="text-xs text-slate-500">Torneo: {quiniela.tournament.name}</p>
      </div>

      {/* Name confirmation */}
      <div className="space-y-2">
        <p className="text-sm text-slate-300">
          Escribe <span className="font-semibold text-white">{quiniela.name}</span> para confirmar:
        </p>
        <Input
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          placeholder={quiniela.name}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="flex-1 border-slate-700 text-slate-300 hover:text-white"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleDelete}
          disabled={!confirmed || loading}
          className={cn(
            'flex-1 transition-all',
            confirmed
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Eliminar quiniela
        </Button>
      </div>
    </div>
  );
}

// ── Voting panel (active tournament) ──────────────────────────────────────

function VotingPanel({
  quiniela,
  isAdmin,
  onDeleted,
  onClose,
}: {
  quiniela: Quiniela;
  isAdmin: boolean;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<QuinielaDeleteStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingVote, setLoadingVote] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get<ApiResponse<QuinielaDeleteStatus>>(
        `/quinielas/${quiniela.slug}/delete-status`
      );
      setStatus(res.data);
    } catch {
      toast.error('No se pudo cargar el estado.');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleVote = async () => {
    setLoadingVote(true);
    try {
      if (status?.my_vote) {
        await api.delete(`/quinielas/${quiniela.slug}/delete-votes`);
        toast.success('Voto revocado.');
      } else {
        await api.post(`/quinielas/${quiniela.slug}/delete-votes`, {});
        toast.success('Voto registrado.');
      }
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al votar.');
    } finally {
      setLoadingVote(false);
    }
  };

  const handleExecuteDelete = async () => {
    setLoadingDelete(true);
    try {
      await api.delete(`/quinielas/${quiniela.slug}`);
      toast.success('Quiniela eliminada.');
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar.');
    } finally {
      setLoadingDelete(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!status) return null;

  const pct = status.participants_count > 0
    ? Math.round((status.votes_count / status.participants_count) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Warning */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/80">
          El torneo está <strong>en curso</strong>. Para eliminar esta quiniela,
          <strong> todos los participantes</strong> deben estar de acuerdo.
        </p>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vote className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Acuerdos para eliminar</span>
          </div>
          <span className="text-sm font-bold text-white tabular-nums">
            {status.votes_count}
            <span className="text-slate-500 font-normal">/{status.participants_count}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full transition-all',
              pct === 100 ? 'bg-emerald-500' : 'bg-amber-500/70'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <p className="text-xs text-slate-500">
          {pct === 100
            ? '✓ Todos de acuerdo — el admin puede confirmar la eliminación.'
            : `Faltan ${status.participants_count - status.votes_count} participante(s) por aceptar.`}
        </p>
      </div>

      {/* Admin-only status note */}
      {!status.admin_voted && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" />
          {isAdmin
            ? 'Cuando votes, los demás participantes verán que solicitaste eliminar la quiniela.'
            : 'El creador no ha solicitado eliminar aún.'}
        </p>
      )}

      {/* My vote status */}
      <AnimatePresence>
        {status.my_vote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">Has aceptado la eliminación.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loadingVote || loadingDelete}
          className="flex-1 border-slate-700 text-slate-300 hover:text-white"
        >
          Cancelar
        </Button>

        {status.can_delete && isAdmin ? (
          <Button
            onClick={handleExecuteDelete}
            disabled={loadingDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loadingDelete ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Confirmar eliminación
          </Button>
        ) : (
          <Button
            onClick={handleVote}
            disabled={loadingVote}
            className={cn(
              'flex-1 transition-all',
              status.my_vote
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            )}
          >
            {loadingVote ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : status.my_vote ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" />Revocar acuerdo</>
            ) : (
              <><Vote className="h-4 w-4 mr-2" />Aceptar eliminación</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  quiniela: Quiniela;
  isAdmin: boolean;
}

export function DeleteQuinielaDialog({ open, onClose, quiniela, isAdmin }: Props) {
  const router = useRouter();
  const window_ = deletionWindow(quiniela);
  const canDeleteFreely = window_ !== 'active';

  const handleDeleted = () => {
    onClose();
    router.push('/');
  };

  const title = canDeleteFreely ? 'Eliminar quiniela' : 'Solicitar eliminación';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="bg-slate-950 border-slate-800 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-white">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              canDeleteFreely ? 'bg-red-950/60 border border-red-800/50' : 'bg-amber-950/60 border border-amber-800/40'
            )}>
              {canDeleteFreely
                ? <Trash2 className="h-4 w-4 text-red-400" />
                : <ShieldAlert className="h-4 w-4 text-amber-400" />}
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {canDeleteFreely ? (
            <motion.div
              key="free"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FreeDeletePanel
                quiniela={quiniela}
                onDeleted={handleDeleted}
                onClose={onClose}
              />
            </motion.div>
          ) : (
            <motion.div
              key="voting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <VotingPanel
                quiniela={quiniela}
                isAdmin={isAdmin}
                onDeleted={handleDeleted}
                onClose={onClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

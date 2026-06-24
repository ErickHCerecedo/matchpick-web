'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';
import { toast } from 'sonner';
import type { ApiResponse, WildcardData, WildcardTeam } from '@/types';
import { Zap, CheckCircle2, Trophy, Clock, Loader2, Save, Lock } from 'lucide-react';

const MAX_PICKS = 3;
const POINTS_PER_TEAM = 5;

function Countdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const target = new Date(deadline).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTimeLeft('Cerrado'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(
        h > 0
          ? `${h}h ${String(m).padStart(2, '0')}m`
          : `${m}m ${String(s).padStart(2, '0')}s`
      );
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [deadline]);

  return <span>{timeLeft}</span>;
}

function TeamCard({
  team,
  selected,
  selectionOrder,
  disabled,
  onToggle,
}: {
  team: WildcardTeam;
  selected: boolean;
  selectionOrder: number | null;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled && !selected}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 text-center w-full',
        selected
          ? 'border-emerald-500/70 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
          : disabled
          ? 'border-slate-800 bg-slate-900/40 opacity-40 cursor-not-allowed'
          : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/60 cursor-pointer'
      )}
    >
      {/* Selection badge */}
      <AnimatePresence>
        {selected && selectionOrder !== null && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md"
          >
            {selectionOrder}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Flag */}
      {team.flag_url ? (
        <img
          src={team.flag_url}
          alt={team.short_name}
          className="w-12 h-8 object-cover rounded shadow-md shrink-0"
        />
      ) : (
        <FlagPlaceholder size="lg" />
      )}

      {/* Name */}
      <span className={cn(
        'text-[11px] font-semibold leading-tight truncate w-full px-1',
        selected ? 'text-emerald-300' : 'text-slate-300'
      )}>
        {team.name}
      </span>
    </motion.button>
  );
}

interface Props {
  quinielaSlug: string;
}

export function WildcardPicker({ quinielaSlug }: Props) {
  const [data, setData] = useState<WildcardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local selection: ordered array of team IDs
  const [picks, setPicks] = useState<number[]>([]);
  const [savedPicks, setSavedPicks] = useState<number[]>([]);

  useEffect(() => {
    api.get<ApiResponse<WildcardData>>(`/quinielas/${quinielaSlug}/wildcard`)
      .then((res) => {
        setData(res.data);
        const ids = res.data.picks.map((t) => t.id);
        setPicks(ids);
        setSavedPicks(ids);
      })
      .catch(() => {/* non-blocking */})
      .finally(() => setLoading(false));
  }, [quinielaSlug]);

  const toggleTeam = useCallback((teamId: number) => {
    setPicks((prev) => {
      if (prev.includes(teamId)) return prev.filter((id) => id !== teamId);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, teamId];
    });
  }, []);

  const isDirty = picks.length > 0 && (
    picks.length !== savedPicks.length ||
    picks.some((id, i) => savedPicks[i] !== id)
  );

  const handleSave = async () => {
    if (picks.length === 0) {
      toast.error('Selecciona al menos un equipo.');
      return;
    }
    setSaving(true);
    try {
      await api.post<ApiResponse<{ picks: WildcardTeam[] }>>(
        `/quinielas/${quinielaSlug}/wildcard`,
        { team_ids: picks }
      );
      setSavedPicks([...picks]);
      toast.success('¡Comodín guardado!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-xl bg-slate-800" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.eligible_teams.length === 0) return null;

  const isOpen = data.is_open;
  const hasResult = data.points_earned !== null;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/20 shrink-0">
          <Zap className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Comodín</p>
          <p className="text-[11px] text-slate-400 leading-tight">
            Elige 3 equipos — ganas <span className="text-amber-400 font-semibold">+5 pts</span> por cada uno que quede en el podio
          </p>
        </div>
        {hasResult ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{data.points_earned} pts</span>
          </div>
        ) : isOpen ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <Countdown deadline={data.deadline} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
            <Lock className="h-3.5 w-3.5" />
            <span>Cerrado</span>
          </div>
        )}
      </div>

      {/* ── Selection counter ── */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_PICKS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                i < picks.length
                  ? 'border-emerald-500 bg-emerald-500/20'
                  : 'border-slate-700 bg-transparent'
              )}
            >
              {i < picks.length && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                />
              )}
            </div>
          ))}
          <span className="text-xs text-slate-500 ml-1">
            {picks.length}/{MAX_PICKS} seleccionados
          </span>
        </div>
        <span className="text-[11px] text-slate-600">
          Máx. {MAX_PICKS * POINTS_PER_TEAM} pts extra
        </span>
      </div>

      {/* ── Team grid ── */}
      <div className="p-4">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {data.eligible_teams.map((team) => {
            const isSelected = picks.includes(team.id);
            const order = isSelected ? picks.indexOf(team.id) + 1 : null;
            const isFull = picks.length >= MAX_PICKS;
            return (
              <TeamCard
                key={team.id}
                team={team}
                selected={isSelected}
                selectionOrder={order}
                disabled={isFull && !isSelected}
                onToggle={() => isOpen && toggleTeam(team.id)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Current picks summary ── */}
      {picks.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {picks.map((id, i) => {
              const team = data.eligible_teams.find((t) => t.id === id);
              if (!team) return null;
              return (
                <div key={id} className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2 py-1">
                  <span className="text-[10px] font-bold text-emerald-600">{i + 1}.</span>
                  {team.flag_url && (
                    <img src={team.flag_url} alt="" className="w-4 h-3 object-cover rounded-sm" />
                  )}
                  <span className="text-[11px] font-semibold text-emerald-300">{team.short_name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Save button ── */}
      {isOpen && (
        <div className="px-4 pb-4">
          <AnimatePresence>
            {(isDirty || savedPicks.length === 0) && picks.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Guardando…' : 'Guardar comodín'}
              </motion.button>
            )}
          </AnimatePresence>
          {savedPicks.length > 0 && !isDirty && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Comodín guardado · puedes cambiar hasta el cierre
            </div>
          )}
        </div>
      )}
    </div>
  );
}

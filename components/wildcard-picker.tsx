'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';
import { toast } from 'sonner';
import type { ApiResponse, WildcardData, WildcardTeam } from '@/types';
import { Zap, CheckCircle2, Trophy, Clock, Loader2, Lock, ChevronDown, Plus } from 'lucide-react';

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

// ── Large pick card shown in the summary row ─────────────────────────────────

function PickCard({
  team,
  position,
  isOpen,
  onRemove,
}: {
  team: WildcardTeam;
  position: number;
  isOpen: boolean;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="relative flex flex-col items-center gap-2 p-3 rounded-xl border border-emerald-500/50 bg-emerald-500/8 flex-1 min-w-0"
    >
      <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 flex items-center justify-center">
        {position}
      </span>
      {isOpen && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-slate-700 hover:bg-red-500/30 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors"
          aria-label="Quitar"
        >
          <span className="text-[10px] font-bold leading-none">×</span>
        </button>
      )}
      {team.flag_url ? (
        <img
          src={team.flag_url}
          alt={team.short_name}
          className="w-14 h-9 object-cover rounded shadow-md mt-2 shrink-0"
        />
      ) : (
        <FlagPlaceholder size="lg" />
      )}
      <span className="text-[11px] font-semibold text-emerald-300 text-center leading-tight truncate w-full px-1">
        {team.name}
      </span>
    </motion.div>
  );
}

// ── Empty slot shown when fewer than 3 picks ─────────────────────────────────

function EmptySlot({
  position,
  onOpen,
}: {
  position: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-800/40 transition-all flex-1 min-h-[100px] group"
    >
      <div className="w-7 h-7 rounded-full border border-dashed border-slate-700 group-hover:border-slate-500 flex items-center justify-center transition-colors">
        <Plus className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
      <span className="text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors">
        Equipo {position}
      </span>
    </motion.button>
  );
}

// ── Selectable team card inside the dropdown grid ────────────────────────────

function GridTeamCard({
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
        'relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-150 text-center w-full',
        selected
          ? 'border-emerald-500/70 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.12)]'
          : disabled
          ? 'border-slate-800 bg-slate-900/40 opacity-40 cursor-not-allowed'
          : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/60 cursor-pointer'
      )}
    >
      <AnimatePresence>
        {selected && selectionOrder !== null && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm"
          >
            {selectionOrder}
          </motion.span>
        )}
      </AnimatePresence>
      {team.flag_url ? (
        <img
          src={team.flag_url}
          alt={team.short_name}
          className="w-10 h-7 object-cover rounded shadow-sm shrink-0"
        />
      ) : (
        <FlagPlaceholder size="md" />
      )}
      <span className={cn(
        'text-[10px] font-semibold leading-tight truncate w-full px-0.5',
        selected ? 'text-emerald-300' : 'text-slate-400'
      )}>
        {team.short_name}
      </span>
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  quinielaSlug: string;
}

export function WildcardPicker({ quinielaSlug }: Props) {
  const [data, setData] = useState<WildcardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

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

  const savepicks = useCallback(async (next: number[]) => {
    setSaving(true);
    try {
      await api.post<ApiResponse<{ picks: WildcardTeam[] }>>(
        `/quinielas/${quinielaSlug}/wildcard`,
        { team_ids: next }
      );
      setSavedPicks([...next]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [quinielaSlug]);

  const toggleTeam = useCallback((teamId: number) => {
    setPicks((prev) => {
      if (prev.includes(teamId)) {
        const next = prev.filter((id) => id !== teamId);
        savepicks(next);
        return next;
      }
      if (prev.length >= MAX_PICKS) return prev;
      const next = [...prev, teamId];
      if (next.length === MAX_PICKS) setGridOpen(false);
      savepicks(next);
      return next;
    });
  }, [savepicks]);

  const removeTeam = useCallback((teamId: number) => {
    setPicks((prev) => {
      const next = prev.filter((id) => id !== teamId);
      savepicks(next);
      return next;
    });
    setGridOpen(true);
  }, [savepicks]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl bg-slate-800" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 flex-1 rounded-xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.eligible_teams.length === 0) return null;

  const isOpen = data.is_open;
  const hasResult = data.points_earned !== null;

  const pickedTeams = picks.map((id) => data.eligible_teams.find((t) => t.id === id)).filter(Boolean) as WildcardTeam[];

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

      {/* ── Picks row: 3 slots ── */}
      <div className="p-4 pb-3">
        <div className="flex gap-2">
          {Array.from({ length: MAX_PICKS }).map((_, i) => {
            const team = pickedTeams[i];
            return team ? (
              <PickCard
                key={team.id}
                team={team}
                position={i + 1}
                isOpen={isOpen}
                onRemove={() => removeTeam(team.id)}
              />
            ) : isOpen ? (
              <EmptySlot key={`empty-${i}`} position={i + 1} onOpen={() => setGridOpen(true)} />
            ) : (
              <div
                key={`locked-${i}`}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-slate-800 bg-slate-900/30 flex-1 min-h-[100px]"
              >
                <Lock className="h-4 w-4 text-slate-700" />
                <span className="text-[10px] text-slate-700">Sin elegir</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dropdown: team grid ── */}
      {isOpen && (
        <div className="px-4 pb-1">
          <button
            type="button"
            onClick={() => setGridOpen((v) => !v)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
              gridOpen
                ? 'border-slate-700 bg-slate-800/60 text-slate-300'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            )}
          >
            <span>
              {picks.length === MAX_PICKS
                ? 'Cambiar selección'
                : `Seleccionar equipos (${picks.length}/${MAX_PICKS})`}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', gridOpen && 'rotate-180')} />
          </button>

          <AnimatePresence initial={false}>
            {gridOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3 pb-1">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {data.eligible_teams.map((team) => {
                      const isSelected = picks.includes(team.id);
                      const order = isSelected ? picks.indexOf(team.id) + 1 : null;
                      const isFull = picks.length >= MAX_PICKS;
                      return (
                        <GridTeamCard
                          key={team.id}
                          team={team}
                          selected={isSelected}
                          selectionOrder={order}
                          disabled={isFull && !isSelected}
                          onToggle={() => toggleTeam(team.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Status bar ── */}
      {isOpen && savedPicks.length > 0 && (
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-center justify-center gap-1.5 text-xs py-1">
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" /><span className="text-slate-500">Guardando…</span></>
              : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Guardado · puedes cambiar hasta el cierre</span></>
            }
          </div>
        </div>
      )}
    </div>
  );
}

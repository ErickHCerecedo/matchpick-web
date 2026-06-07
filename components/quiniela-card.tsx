'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TournamentLogo } from '@/components/tournament-logo';
import { cn } from '@/lib/utils';
import type { Quiniela } from '@/types';

interface Props {
  quiniela: Quiniela;
  index: number;
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-400';
  if (rank === 2) return 'text-slate-300';
  if (rank === 3) return 'text-orange-500';
  return 'text-slate-400';
}

export function QuinielaCard({ quiniela, index }: Props) {
  const standing  = quiniela.my_standing;
  const pending   = quiniela.pending_predictions_count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <Link href={`/quinielas/${quiniela.slug}`}>
        <div className={cn(
          'h-full rounded-2xl border bg-slate-900 p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200',
          'border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/90',
        )}>

          {/* ── Header: logo + name ─────────────────────────────── */}
          <div className="flex items-start gap-3 min-w-0">
            <TournamentLogo tournament={quiniela.tournament} size="sm" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white leading-snug line-clamp-2 text-sm">
                {quiniela.name}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {quiniela.tournament.name}
              </p>
            </div>
            {quiniela.my_role === 'admin' && (
              <Badge className="shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] px-1.5">
                Admin
              </Badge>
            )}
          </div>

          {/* ── Stats row ───────────────────────────────────────── */}
          <div className="flex items-center justify-between text-xs mt-auto">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Users className="h-3 w-3" />
              <span>{quiniela.participants_count} jugadores</span>
            </div>

            {standing ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className={cn('font-medium tabular-nums', rankColor(standing.rank))}>
                  Posición {standing.rank}°
                </span>
                <span className="text-slate-600">con</span>
                <span className={cn('font-bold tabular-nums', rankColor(standing.rank))}>
                  {standing.total_points} puntos
                </span>
              </div>
            ) : (
              <span className="text-slate-600 text-[11px]">Sin puntos aún</span>
            )}
          </div>

          {/* ── Pending predictions alert ───────────────────────── */}
          {pending > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/8 border border-amber-500/15 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="text-[11px] text-amber-400 font-medium">
                {pending} {pending === 1 ? 'pronóstico pendiente' : 'pronósticos pendientes'}
              </span>
            </div>
          )}

        </div>
      </Link>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users } from 'lucide-react';
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
  const standing = quiniela.my_standing;
  const pending  = quiniela.pending_predictions_count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="relative"
    >
      {/* Notification badge — top-right corner */}
      {pending > 0 && (
        <div className="absolute -top-2 -right-2 z-20 flex items-center justify-center min-w-5.5 h-5.5 px-1.5 rounded-full bg-amber-500 text-black text-[10px] font-black leading-none shadow-lg shadow-amber-500/40 ring-2 ring-slate-950 select-none">
          {pending > 99 ? '99+' : pending}
        </div>
      )}

      <Link href={`/quinielas/${quiniela.slug}`}>
        <div className={cn(
          'h-full rounded-2xl border bg-slate-950 p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200',
          pending > 0
            ? 'border-amber-500/30 hover:border-amber-500/60'
            : 'border-slate-800 hover:border-emerald-500/40',
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

        </div>
      </Link>
    </motion.div>
  );
}

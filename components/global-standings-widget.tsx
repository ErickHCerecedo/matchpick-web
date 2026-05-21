'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface GlobalStanding {
  id: number;
  name: string;
  avatar_url: string | null;
  total_points: number;
  exact_scores: number;
  correct_results: number;
  predictions_made: number;
}

interface Props {
  standings: GlobalStanding[];
  loading?: boolean;
  currentUserId?: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function GlobalStandingsWidget({ standings, loading, currentUserId }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <p className="text-center text-slate-400 text-sm py-6">
        Aún no hay posiciones. Los puntos se calculan cuando los partidos terminan.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {standings.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: i * 0.04 }}
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-xl border',
            s.id === currentUserId
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-slate-900/50 border-slate-800'
          )}
        >
          <span className="w-6 text-center text-base shrink-0">
            {i < 3 ? (
              MEDALS[i]
            ) : (
              <span className="text-slate-500 text-xs font-mono">#{i + 1}</span>
            )}
          </span>

          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={s.avatar_url ?? undefined} />
            <AvatarFallback className="bg-slate-700 text-white text-xs">
              {s.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="flex-1 text-sm text-white truncate">
            {s.name}
            {s.id === currentUserId && (
              <span className="ml-1 text-xs text-emerald-400">(tú)</span>
            )}
          </span>

          <div className="text-right shrink-0">
            <span className="text-base font-bold text-white">{s.total_points}</span>
            <span className="text-xs text-slate-500 ml-0.5">pts</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

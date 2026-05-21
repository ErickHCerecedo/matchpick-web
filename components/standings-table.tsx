'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Standing } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  standings: Standing[];
  currentUserId?: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function StandingsTable({ standings, currentUserId }: Props) {
  if (standings.length === 0) {
    return (
      <p className="text-center text-slate-400 py-10 text-sm">
        Aún no hay posiciones. ¡Haz tus predicciones!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {standings.map((s, i) => (
        <motion.div
          key={s.user.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl border',
            s.user.id === currentUserId
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-slate-900 border-slate-800'
          )}
        >
          <span className="w-7 text-center text-lg">
            {i < 3 ? (
              MEDALS[i]
            ) : (
              <span className="text-slate-400 text-sm font-mono">#{s.rank}</span>
            )}
          </span>

          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={s.user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-slate-700 text-white text-xs">
              {s.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="flex-1 text-sm font-medium text-white truncate">
            {s.user.name}
            {s.user.id === currentUserId && (
              <span className="ml-1.5 text-xs text-emerald-400">(tú)</span>
            )}
          </span>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-xs text-slate-400 text-right">
              <div>{s.exact_scores} exactos</div>
              <div>{s.correct_results} resultados</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">{s.total_points}</div>
              <div className="text-xs text-slate-500">pts</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

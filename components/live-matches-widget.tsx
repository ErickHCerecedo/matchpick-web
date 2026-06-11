'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';
import { cn } from '@/lib/utils';
import type { ApiResponse, LiveMatch, Quiniela } from '@/types';

export function LiveMatchesWidget() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [tournamentSlugs, setTournamentSlugs] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const prevCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    const [lRes, qRes] = await Promise.all([
      api.get<ApiResponse<LiveMatch[]>>('/matches/live').catch(() => ({ data: [] as LiveMatch[] })),
      api.get<ApiResponse<Quiniela[]>>('/quinielas').catch(() => ({ data: [] as Quiniela[] })),
    ]);
    setTournamentSlugs(new Set(qRes.data.map((q) => q.tournament.slug)));
    setLiveMatches(lRes.data);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const relevantMatches = liveMatches.filter((m) => tournamentSlugs.has(m.tournament.slug));

  // Auto-expand when a new match goes live
  useEffect(() => {
    if (relevantMatches.length > prevCountRef.current) {
      setCollapsed(false);
    }
    prevCountRef.current = relevantMatches.length;
  }, [relevantMatches.length]);

  if (relevantMatches.length === 0) return null;

  return (
    // bottom-20 on mobile clears the ~64px bottom nav; md:bottom-6 on desktop
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">

      {/* Expanded widget */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            key="widget"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => { if (info.offset.y > 50) setCollapsed(true); }}
            className="w-60 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-red-500/25 bg-slate-900 pointer-events-auto cursor-grab active:cursor-grabbing select-none"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-black/20 border-b border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-red-400 flex-1 leading-none">Jugando ahora</span>
              <span className="text-[10px] text-slate-500 font-medium">
                {relevantMatches.length} {relevantMatches.length === 1 ? 'partido' : 'partidos'}
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="p-0.5 ml-1 rounded text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Match rows */}
            <div className="divide-y divide-slate-800/50">
              {relevantMatches.map((match) => (
                <div key={match.id} className="flex items-center gap-2 px-3 py-2.5">
                  {/* Home team */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="text-[11px] font-bold text-white truncate leading-none">
                      {match.home_team?.short_name ?? match.home_placeholder ?? '?'}
                    </span>
                    {match.home_team?.flag_url ? (
                      <img
                        src={match.home_team.flag_url}
                        alt=""
                        className="w-6 h-4 object-cover rounded-sm shrink-0 shadow-sm"
                      />
                    ) : (
                      <FlagPlaceholder size="xs" />
                    )}
                  </div>

                  {/* Score */}
                  <div className="shrink-0 flex flex-col items-center gap-0.5">
                    <span className={cn(
                      'text-sm font-bold font-mono tabular-nums leading-none',
                      match.result ? 'text-white' : 'text-red-400'
                    )}>
                      {match.result
                        ? `${match.result.home_score}–${match.result.away_score}`
                        : '0–0'
                      }
                    </span>
                    <span className="text-[8px] font-bold text-red-500/80 uppercase tracking-widest leading-none">
                      vivo
                    </span>
                  </div>

                  {/* Away team */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {match.away_team?.flag_url ? (
                      <img
                        src={match.away_team.flag_url}
                        alt=""
                        className="w-6 h-4 object-cover rounded-sm shrink-0 shadow-sm"
                      />
                    ) : (
                      <FlagPlaceholder size="xs" />
                    )}
                    <span className="text-[11px] font-bold text-white truncate leading-none">
                      {match.away_team?.short_name ?? match.away_placeholder ?? '?'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed pill — always render when there are matches */}
      <motion.button
        key="pill"
        onClick={() => setCollapsed(false)}
        animate={collapsed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8, pointerEvents: 'none' }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900 border border-red-500/40 shadow-xl shadow-red-500/10 text-xs font-bold text-red-400 pointer-events-auto"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
        {relevantMatches.length} en vivo
        <ChevronDown className="h-3 w-3 rotate-180 text-red-400/70" />
      </motion.button>
    </div>
  );
}

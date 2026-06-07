'use client';

import { Fragment } from 'react';
import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TeamStandingsData, TeamStandingRow } from '@/types';

interface Props {
  data: TeamStandingsData | null;
  loading: boolean;
}

interface TableProps {
  teams: TeamStandingRow[];
  qualificationSpots: number;
}

function StandingsTable({ teams, qualificationSpots }: TableProps) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
        <Trophy className="h-7 w-7 opacity-30" />
        <p className="text-sm">Sin resultados aún.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-slate-800">
          <th className="w-7 text-center py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">#</th>
          <th className="text-left py-2.5 pl-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Equipo</th>
          <th className="hidden sm:table-cell w-8 text-center py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PJ</th>
          <th className="hidden sm:table-cell w-8 text-center py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">G</th>
          <th className="hidden sm:table-cell w-8 text-center py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">E</th>
          <th className="hidden sm:table-cell w-8 text-center py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">P</th>
          <th className="hidden sm:table-cell w-10 text-center py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">DIF</th>
          <th className="w-10 text-center py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PTS</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((team, idx) => (
          <Fragment key={team.id}>
            {idx === qualificationSpots && (
              <tr aria-hidden>
                <td colSpan={8} className="py-0.5 px-2">
                  <div className="border-t border-dashed border-slate-700/60" />
                </td>
              </tr>
            )}
            <tr
              className={cn(
                'transition-colors',
                idx < qualificationSpots ? 'bg-emerald-500/[0.04]' : 'hover:bg-slate-800/30'
              )}
            >
              <td
                className={cn(
                  'text-center py-2.5 text-sm font-medium tabular-nums',
                  idx < qualificationSpots
                    ? 'border-l-2 border-emerald-500 text-emerald-400/70'
                    : 'border-l-2 border-transparent text-slate-500'
                )}
              >
                {idx + 1}
              </td>
              <td className="py-2.5 pl-2 pr-2">
                <div className="flex items-center gap-2 min-w-0">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.short_name}
                      className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-3.5 bg-slate-700 rounded-sm shrink-0" />
                  )}
                  <span className="font-medium text-white truncate leading-tight">
                    <span className="sm:hidden">{team.short_name}</span>
                    <span className="hidden sm:inline">{team.name}</span>
                  </span>
                </div>
              </td>
              <td className="hidden sm:table-cell text-center py-2.5 text-slate-400 tabular-nums">{team.played}</td>
              <td className="hidden sm:table-cell text-center py-2.5 text-slate-400 tabular-nums">{team.won}</td>
              <td className="hidden sm:table-cell text-center py-2.5 text-slate-400 tabular-nums">{team.drawn}</td>
              <td className="hidden sm:table-cell text-center py-2.5 text-slate-400 tabular-nums">{team.lost}</td>
              <td className="hidden sm:table-cell text-center py-2.5 text-slate-400 tabular-nums">
                {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
              </td>
              <td
                className={cn(
                  'text-center py-2.5 font-bold tabular-nums',
                  idx < qualificationSpots ? 'text-emerald-400' : 'text-white'
                )}
              >
                {team.points}
              </td>
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

export function TeamStandings({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-52 rounded-xl bg-slate-800" />
        <Skeleton className="h-52 rounded-xl bg-slate-800" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
        <Trophy className="h-10 w-10 opacity-30" />
        <p className="text-sm">Clasificación no disponible.</p>
      </div>
    );
  }

  if (data.format === 'groups') {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {data.groups.map((group) => (
          <div
            key={group.name}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.name}
              </h4>
            </div>
            <StandingsTable teams={group.teams} qualificationSpots={data.qualification_spots} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800 flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-amber-400" />
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Tabla General
        </h4>
        <span className="ml-auto text-[10px] text-emerald-600 font-medium">
          Top {data.qualification_spots} clasifican
        </span>
      </div>
      <StandingsTable teams={data.teams} qualificationSpots={data.qualification_spots} />
    </div>
  );
}

'use client';

import { Globe, Shield, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tournament } from '@/types';

interface Props {
  tournament: Pick<Tournament, 'logo_url' | 'type' | 'is_custom' | 'name'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: { wrapper: 'w-9 h-9 rounded-lg',   icon: 'h-4 w-4' },
  md: { wrapper: 'w-11 h-11 rounded-xl',  icon: 'h-5 w-5' },
  lg: { wrapper: 'w-14 h-14 rounded-2xl', icon: 'h-6 w-6' },
} as const;

// Visual config per tournament type
const TYPE_STYLE: Record<string, { gradient: string; icon: React.ElementType; iconColor: string; ring: string }> = {
  world_cup: {
    gradient: 'bg-gradient-to-br from-[#00563f] via-[#0d1b2a] to-[#8B001A]',
    icon: Globe,
    iconColor: 'text-white/90',
    ring: 'ring-1 ring-white/10',
  },
  league: {
    gradient: 'bg-gradient-to-br from-emerald-950 to-slate-950',
    icon: Shield,
    iconColor: 'text-emerald-400',
    ring: 'ring-1 ring-emerald-800/40',
  },
  cup: {
    gradient: 'bg-gradient-to-br from-amber-950 to-slate-950',
    icon: Trophy,
    iconColor: 'text-amber-400',
    ring: 'ring-1 ring-amber-800/30',
  },
};

const CUSTOM_STYLE = {
  gradient: 'bg-gradient-to-br from-violet-950 to-slate-950',
  icon: Sparkles,
  iconColor: 'text-violet-400',
  ring: 'ring-1 ring-violet-800/30',
};

export function TournamentLogo({ tournament, size = 'md', className }: Props) {
  const { wrapper, icon: iconSize } = SIZE[size];

  if (tournament.logo_url) {
    return (
      <div className={cn('shrink-0 overflow-hidden flex items-center justify-center', wrapper, className)}>
        <img
          src={tournament.logo_url}
          alt={tournament.name}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const style = tournament.is_custom
    ? CUSTOM_STYLE
    : (TYPE_STYLE[tournament.type] ?? TYPE_STYLE.cup);

  const Icon = style.icon;

  return (
    <div
      className={cn(
        'shrink-0 flex items-center justify-center',
        wrapper,
        style.gradient,
        style.ring,
        className
      )}
    >
      <Icon className={cn(iconSize, style.iconColor)} />
    </div>
  );
}

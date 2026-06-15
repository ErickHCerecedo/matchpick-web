import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { wrapper: string; icon: string }> = {
  xs: { wrapper: 'w-4 h-3',   icon: 'h-1.5 w-1.5' },
  sm: { wrapper: 'w-5 h-3.5', icon: 'h-2 w-2'     },
  md: { wrapper: 'w-7 h-5',   icon: 'h-3 w-3'     },
  lg: { wrapper: 'w-12 h-8',  icon: 'h-5 w-5'     },
};

// Diagonal stripe texture that gives depth without being distracting
const STRIPE = 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(100,116,139,0.10) 3px, rgba(100,116,139,0.10) 4px)';

export function FlagPlaceholder({ size = 'sm', className }: { size?: Size; className?: string }) {
  const s = SIZE[size];
  return (
    <div
      className={cn(
        s.wrapper,
        'rounded-sm border border-slate-700/50 bg-slate-900 flex items-center justify-center shrink-0 relative overflow-hidden',
        className,
      )}
      style={{ backgroundImage: STRIPE }}
    >
      <Globe className={cn(s.icon, 'text-slate-500 relative z-10 shrink-0')} />
    </div>
  );
}

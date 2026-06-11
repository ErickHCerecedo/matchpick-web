import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { wrapper: string; text: string }> = {
  sm:  { wrapper: 'w-5 h-3.5',  text: 'text-[7px]'  },
  md:  { wrapper: 'w-7 h-5',    text: 'text-[9px]'  },
  lg:  { wrapper: 'w-12 h-8',   text: 'text-[11px]' },
};

export function FlagPlaceholder({ size = 'sm', className }: { size?: Size; className?: string }) {
  const s = SIZE[size];
  return (
    <div
      className={cn(
        s.wrapper,
        'rounded-sm border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0',
        className,
      )}
    >
      <span className={cn(s.text, 'font-bold text-slate-500 leading-none select-none')}>?</span>
    </div>
  );
}

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn, formatMatchDateParts } from '@/lib/utils';
import type { RoundWithMatches, Match } from '@/types';
import { Trophy, GitBranch, CheckCircle2, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';
import { Badge } from '@/components/ui/badge';

// ── Metadata ───────────────────────────────────────────────────────────────────

const KNOCKOUT_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'];
const BRACKET_ORDER  = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];

const ROUND_META: Record<string, { label: string; abbr: string }> = {
  round_of_32: { label: 'Dieciseisavos de final', abbr: 'R32'    },
  round_of_16: { label: 'Octavos de final',       abbr: 'R16'    },
  quarter:     { label: 'Cuartos de final',        abbr: 'QF'     },
  semi:        { label: 'Semifinal',               abbr: 'SF'     },
  third_place: { label: 'Tercer puesto',           abbr: '3er P.' },
  final:       { label: 'FINAL',                   abbr: 'FINAL'  },
};

const CARD_BG =
  'https://res.cloudinary.com/dr0klvutj/image/upload/v1781001150/MatchPick/file_00000000042c71fb8d0d570a11881d55.png';

// ── Bracket geometry ───────────────────────────────────────────────────────────

const SLOT_H  = 182;
const CARD_H  = 160;   // matches MatchCard natural height (p-4 + date + teams w-12h-8 + venue)
const COL_W   = 256;   // wide enough for w-12 h-8 flags × 2 + score + px-4 padding
const COL_GAP = 48;
const PAD_X   = 20;
const PAD_Y   = 28;

// ── Mobile bracket geometry (wider cards for 80/20 peek UX) ───────────────────
const COL_W_M         = 330;   // close to full-width MatchCard on mobile
const COL_GAP_M       = 36;    // gap when on first column (peek of next)
const COL_GAP_M_COMPACT = 16;  // gap when on column 1+ (tighter, shows more peek)
const PEEK_PAD        = 10;    // px: left margin for the active column

function colXM(rIdx: number): number {
  return rIdx * (COL_W_M + COL_GAP_M);
}

function matchTop(roundIdx: number, slotIdx: number): number {
  const pow2 = 1 << roundIdx;
  return PAD_Y + slotIdx * pow2 * SLOT_H + ((pow2 - 1) * SLOT_H) / 2 + (SLOT_H - CARD_H) / 2;
}
function matchCenterY(roundIdx: number, slotIdx: number): number {
  return matchTop(roundIdx, slotIdx) + CARD_H / 2;
}
function colX(rIdx: number): number {
  return PAD_X + rIdx * (COL_W + COL_GAP);
}

// ── TreeCard ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<Match['status'], string> = {
  scheduled:   'Programado',
  in_progress: 'Jugando',
  finished:    'Finalizado',
  cancelled:   'Cancelado',
};

const STATUS_COLORS: Record<Match['status'], { dot: string; icon: string; line: string; badge: string }> = {
  scheduled:   { dot: 'bg-emerald-400', icon: 'text-emerald-400', line: 'bg-emerald-400/60', badge: 'border-emerald-600/40 text-emerald-400' },
  in_progress: { dot: 'bg-red-400',     icon: 'text-red-400',     line: 'bg-red-400/60',     badge: 'border-red-500/60 text-red-400'         },
  finished:    { dot: 'bg-slate-500',   icon: 'text-slate-500',   line: 'bg-slate-600/60',   badge: 'border-slate-600 text-slate-500'         },
  cancelled:   { dot: 'bg-slate-500',   icon: 'text-slate-500',   line: 'bg-slate-600/60',   badge: 'border-slate-600 text-slate-500'         },
};

// MatchCard-style layout: flag + name stacked, score in the middle.
// colW drives proportional flag sizing so both desktop (136px) and mobile (300px) look right.
function TreeCard({ match, active, colW = COL_W }: { match: Match; active: boolean; colW?: number }) {
  const fin      = match.status === 'finished';
  const live     = match.status === 'in_progress';
  const homeWon  = fin && match.result?.winner === 'home';
  const awayWon  = fin && match.result?.winner === 'away';
  const sc       = STATUS_COLORS[match.status];
  const hasResult = fin || live;
  const { date, time } = formatMatchDateParts(match.scheduled_at);

  // Same proportions as MatchCard — both COL_W (256) and COL_W_M (330) fit these comfortably.

  const teamCol = (side: 'home' | 'away', won: boolean, lost: boolean) => {
    const team   = side === 'home' ? match.home_team : match.away_team;
    const phText = side === 'home' ? match.home_placeholder : match.away_placeholder;
    const name   = team?.short_name ?? team?.name ?? phText;
    const flag   = team?.flag_url;

    return (
      <div className={cn('flex-1 flex flex-col items-center gap-1 min-w-0', lost && 'opacity-35')}>
        {flag
          ? <img src={flag} alt="" className="w-12 h-8 object-cover rounded shadow-md shrink-0" />
          : <FlagPlaceholder size="lg" />
        }
        <span className={cn(
          'text-[11px] w-full font-semibold text-center leading-tight truncate px-0.5',
          !name ? 'text-slate-600 italic' :
          won   ? 'text-white' :
          fin   ? 'text-slate-400' : 'text-slate-200',
        )}>
          {name ?? '···'}
        </span>
        <div className={cn('h-0.5 w-8 rounded-full', sc.line)} />
      </div>
    );
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden transition-all duration-200',
        live   ? 'border-red-500/40'                                     :
        active ? 'border-emerald-500/60 shadow-sm shadow-emerald-500/20' :
                 'border-slate-700/60',
      )}
      style={{ width: colW, height: CARD_H }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{ backgroundImage: `url(${CARD_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 z-0 bg-slate-950/80" />

      <div className="relative z-10 flex flex-col h-full px-2 py-1.5 gap-0.5">

        {/* ── Date / status row ────────────────────────────────── */}
        <div className="flex items-center justify-between gap-1 shrink-0">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <Calendar className={cn('h-2.5 w-2.5 shrink-0', sc.icon)} />
            <span className="text-[9px] font-medium text-slate-400 truncate">{date}</span>
            <span className="text-[8px] text-slate-600 shrink-0 mx-px">|</span>
            <span className="text-[9px] text-slate-500 shrink-0">{time}</span>
          </div>
          <Badge
            variant="outline"
            className={cn('text-[9px] flex items-center gap-1 px-1.5 py-px h-auto font-medium', sc.badge)}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot, live && 'animate-pulse')} />
            {STATUS_LABELS[match.status]}
          </Badge>
        </div>

        {/* ── Teams: home | score | away (MatchCard-style horizontal) ── */}
        <div className="flex items-center gap-1.5 flex-1 min-h-0">
          {teamCol('home', homeWon, awayWon)}

          {/* Score / VS */}
          <div className="flex flex-col items-center justify-center shrink-0 px-0.5 gap-0.5">
            {hasResult ? (
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className={cn('w-8 text-center text-xl tabular-nums font-mono', homeWon ? 'text-white' : 'text-slate-400')}>
                  {match.result?.home_score ?? '–'}
                </span>
                <span className="text-slate-500 text-sm font-normal">–</span>
                <span className={cn('w-8 text-center text-xl tabular-nums font-mono', awayWon ? 'text-white' : 'text-slate-400')}>
                  {match.result?.away_score ?? '–'}
                </span>
              </div>
            ) : (
              <span className="text-xs font-black tracking-widest text-white/80 bg-white/10 border border-white/20 rounded px-2.5 py-0.5 backdrop-blur-sm">
                VS
              </span>
            )}
          </div>

          {teamCol('away', awayWon, homeWon)}
        </div>

        {/* ── Venue ────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1 min-w-0 overflow-hidden shrink-0">
          <MapPin className={cn('h-2.5 w-2.5 shrink-0', sc.icon)} />
          <span className="text-[9px] text-slate-400 truncate">
            {match.venue ?? 'Por definir'}
          </span>
        </div>

      </div>
    </div>
  );
}

// ── Connector SVG ──────────────────────────────────────────────────────────────

function ConnectorLines({
  bracketRounds,
  totalW,
  totalH,
  highlightRoundIdx,
  getColX = colX,
  colWidth = COL_W,
  colGap = COL_GAP,
  getMatchCenterY: getY = matchCenterY,
}: {
  bracketRounds: RoundWithMatches[];
  totalW: number;
  totalH: number;
  highlightRoundIdx?: number;
  getColX?: (rIdx: number) => number;
  colWidth?: number;
  colGap?: number;
  getMatchCenterY?: (rIdx: number, sIdx: number) => number;
}) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
      {bracketRounds.slice(0, -1).map((_, rIdx) => {
        const nextCount = bracketRounds[rIdx + 1]?.matches.length ?? 0;
        const fromX = getColX(rIdx) + colWidth;
        const midX  = fromX + colGap / 2;
        const toX   = getColX(rIdx + 1);
        const visible = highlightRoundIdx === undefined
          || rIdx === highlightRoundIdx
          || rIdx + 1 === highlightRoundIdx;
        return Array.from({ length: nextCount }, (_, ps) => {
          const topY = getY(rIdx, ps * 2);
          const botY = getY(rIdx, ps * 2 + 1);
          const midY = (topY + botY) / 2;
          return (
            <path
              key={`c-${rIdx}-${ps}`}
              d={`M ${fromX} ${topY} H ${midX} V ${botY} M ${fromX} ${botY} H ${midX} M ${midX} ${midY} H ${toX}`}
              stroke={visible ? '#1e293b' : '#0d1422'}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          );
        });
      })}
    </svg>
  );
}

// ── Desktop bracket tree ───────────────────────────────────────────────────────

function DesktopBracket({
  bracketRounds,
  thirdPlace,
  activeRoundId,
  onSelectRound,
}: {
  bracketRounds: RoundWithMatches[];
  thirdPlace: RoundWithMatches | undefined;
  activeRoundId: number | null;
  onSelectRound: (id: number) => void;
}) {
  const firstCount = bracketRounds[0]?.matches.length ?? 0;
  if (!firstCount) return null;

  const totalH = firstCount * SLOT_H + 2 * PAD_Y;
  const totalW = bracketRounds.length * COL_W + (bracketRounds.length - 1) * COL_GAP + 2 * PAD_X;

  return (
    <div className="overflow-x-auto overflow-y-auto scrollbar-none" style={{ maxHeight: 860 }}>
      <div className="relative" style={{ width: totalW, height: totalH }}>

        {/* Column labels */}
        {bracketRounds.map((r, rIdx) => (
          <div
            key={`lbl-${r.round.id}`}
            className="absolute text-[9px] font-bold uppercase tracking-widest text-slate-600 text-center"
            style={{ left: colX(rIdx), width: COL_W, top: 6 }}
          >
            {ROUND_META[r.round.type]?.abbr ?? r.round.name}
          </div>
        ))}

        <ConnectorLines
          bracketRounds={bracketRounds}
          totalW={totalW}
          totalH={totalH}
        />

        {/* Match cards */}
        {bracketRounds.map((r, rIdx) =>
          r.matches.map((match, sIdx) => (
            <button
              key={match.id}
              onClick={() => onSelectRound(r.round.id)}
              className="absolute focus:outline-none hover:z-10"
              style={{ left: colX(rIdx), top: matchTop(rIdx, sIdx) }}
            >
              <TreeCard match={match} active={r.round.id === activeRoundId} />
            </button>
          ))
        )}
      </div>

      {/* Third place — below the bracket */}
      {thirdPlace && thirdPlace.matches.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center gap-3 px-1">
          <div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">
              {ROUND_META.third_place.abbr}
            </p>
            <button onClick={() => onSelectRound(thirdPlace.round.id)} className="focus:outline-none">
              <TreeCard match={thirdPlace.matches[0]} active={activeRoundId === thirdPlace.round.id} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile single-column bracket ───────────────────────────────────────────────

function MobileBracket({
  bracketRounds,
  activeColIdx,
  onChangeColIdx,
}: {
  bracketRounds: RoundWithMatches[];
  activeColIdx: number;
  onChangeColIdx: (idx: number) => void;
}) {
  // Hooks before any conditional return (rules of hooks).
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  // Reset vertical scroll each time the active column changes so the user
  // always sees the top of the new column without empty space below.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeColIdx]);

  const firstCount = bracketRounds[0]?.matches.length ?? 0;
  if (!firstCount) return null;

  // Compress inter-column gap once the user leaves the first column.
  const gapM     = activeColIdx === 0 ? COL_GAP_M : COL_GAP_M_COMPACT;
  const colXMDyn = (rIdx: number) => rIdx * (COL_W_M + gapM);

  const cols             = bracketRounds.length;
  // Canvas height adapts to the active column's match count so there's no
  // wasted vertical space — all columns use the same SLOT_H density as R32.
  const activeMatchCount = bracketRounds[activeColIdx]?.matches.length ?? firstCount;
  const totalH           = activeMatchCount * SLOT_H + 2 * PAD_Y;
  const totalW           = cols * COL_W_M + (cols - 1) * gapM;

  // Uniform vertical position — same card density in every column.
  const mobileCardTop = (sIdx: number) => PAD_Y + sIdx * SLOT_H + (SLOT_H - CARD_H) / 2;
  // Connector line center Y consistent with mobileCardTop.
  const mobileCenterY = (_rIdx: number, sIdx: number) => PAD_Y + sIdx * SLOT_H + SLOT_H / 2;

  // Slide canvas so active column's left edge sits at PEEK_PAD → ~80/20 split.
  const offsetX = PEEK_PAD - colXMDyn(activeColIdx);

  // ── Swipe detection via native touch events ─────────────────────────────────
  // We intentionally bypass Framer Motion's drag prop because when the browser
  // takes over a vertical scroll gesture it fires pointercancel, which Framer
  // Motion still converts into onDragEnd with whatever diagonal delta accumulated
  // before the browser took over. That false positive was resetting the column.
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Require the gesture to be at least 2× more horizontal than vertical.
    if (Math.abs(dy) * 0.5 >= Math.abs(dx)) return;

    const threshold = COL_W_M * 0.2; // 20% of column width
    if (dx < -threshold && activeColIdx < bracketRounds.length - 1) onChangeColIdx(activeColIdx + 1);
    if (dx >  threshold && activeColIdx > 0)                         onChangeColIdx(activeColIdx - 1);
  };

  // Reset refs if the browser cancels the touch (takes over scroll).
  const onTouchCancel = () => {
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div className="relative rounded-xl">
      {/* Outer: clips x, scrolls y — all matches reachable via vertical scroll */}
      <div
        ref={scrollRef}
        style={{ overflowX: 'hidden', overflowY: 'auto', maxHeight: '72dvh' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <motion.div
          className="relative"
          animate={{ x: offsetX }}
          transition={{ type: 'spring', stiffness: 280, damping: 32 }}
          style={{ width: totalW, height: totalH }}
        >
          <ConnectorLines
            bracketRounds={bracketRounds}
            totalW={totalW}
            totalH={totalH}
            highlightRoundIdx={activeColIdx}
            getColX={colXMDyn}
            colWidth={COL_W_M}
            colGap={gapM}
            getMatchCenterY={mobileCenterY}
          />

          {bracketRounds.map((r, rIdx) =>
            r.matches.map((match, sIdx) => (
              <div
                key={match.id}
                className="absolute"
                style={{
                  left: colXMDyn(rIdx),
                  top: mobileCardTop(sIdx),
                  transition: 'left 0.3s ease-out',
                }}
              >
                <TreeCard match={match} active={rIdx === activeColIdx} colW={COL_W_M} />
              </div>
            ))
          )}
        </motion.div>
      </div>

      {/* Left fade — softens partial view of previous column */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-slate-950/70 to-transparent z-10 rounded-l-xl" />
      {/* Right fade — peek zone: connector lines + partial next column visible here */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950/80 to-transparent z-10 rounded-r-xl" />
    </div>
  );
}

// ── Champion panel ─────────────────────────────────────────────────────────────

function ChampionPanel({ name, flag }: { name: string; flag?: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-10 gap-4"
    >
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-linear-to-br from-amber-400/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10">
          {flag
            ? <img src={flag} alt={name} className="w-14 h-10 object-cover rounded-md shadow-md" />
            : <Trophy className="h-9 w-9 text-amber-400" />
          }
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
          <Trophy className="h-3 w-3 text-white" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-[11px] font-bold text-amber-500/70 uppercase tracking-widest">Campeón FIFA World Cup 2026</p>
        <p className="text-2xl font-black text-amber-300">{name}</p>
      </div>
      <div className="flex items-center gap-1.5 text-amber-500/50">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="text-base">★</span>
        ))}
      </div>
    </motion.div>
  );
}

// ── Mobile round carousel ──────────────────────────────────────────────────────

type CarouselEntry =
  | { kind: 'round'; round: RoundWithMatches }
  | { kind: 'champion'; name: string; flag?: string | null };

function MobileRoundCarousel({
  entries,
  activeIdx,
  onSelect,
}: {
  entries: CarouselEntry[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[activeIdx] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, [activeIdx]);

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-3 scrollbar-none px-4"
    >
      {entries.map((entry, i) => {
        const isActive  = i === activeIdx;
        const isFinal   = entry.kind === 'round' && entry.round.round.type === 'final';
        const isChamp   = entry.kind === 'champion';

        const label = entry.kind === 'champion'
          ? 'Campeón'
          : ROUND_META[entry.round.round.type]?.label ?? entry.round.round.name;

        const sub = entry.kind === 'champion'
          ? entry.name
          : `${entry.round.matches.length} partido${entry.round.matches.length !== 1 ? 's' : ''} · ${entry.round.matches.filter(m => m.status === 'finished').length} finalizados`;

        const allDone = entry.kind === 'round' && entry.round.matches.every(m => m.status === 'finished');

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              'shrink-0 snap-start rounded-2xl border px-5 py-4 text-left transition-all duration-200 focus:outline-none',
              isChamp
                ? isActive
                  ? 'bg-linear-to-br from-amber-950/70 to-slate-950 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/60 border-amber-500/20 hover:border-amber-500/40'
                : isFinal
                ? isActive
                  ? 'bg-linear-to-br from-amber-950/60 to-emerald-950/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-700 hover:border-amber-500/30'
                : isActive
                ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                : 'bg-slate-900/60 border-slate-700 hover:border-slate-600',
            )}
            style={{ width: '75vw', minWidth: '75vw' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn(
                'text-base font-black leading-tight',
                isChamp ? (isActive ? 'text-amber-300' : 'text-amber-500/60') :
                isFinal ? (isActive ? 'text-amber-300' : 'text-slate-400')    :
                           isActive ? 'text-emerald-300' : 'text-slate-300',
              )}>
                {label}
              </span>
              {allDone && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
              {isChamp && <Trophy className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
            </div>
            <p className={cn(
              'text-xs mt-1 leading-snug',
              isActive ? 'text-slate-400' : 'text-slate-600',
            )}>
              {sub}
            </p>
          </button>
        );
      })}

      {/* Spacer so last pill can scroll to show peek of nothing */}
      <div className="shrink-0 w-[20vw]" />
    </div>
  );
}

// ── Desktop compact round strip ────────────────────────────────────────────────

function DesktopRoundStrip({
  knockoutRounds,
  activeRoundId,
  onSelect,
}: {
  knockoutRounds: RoundWithMatches[];
  activeRoundId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
      {knockoutRounds.map((r, idx) => {
        const meta    = ROUND_META[r.round.type];
        const isActive = activeRoundId === r.round.id;
        const allDone  = r.matches.every(m => m.status === 'finished');
        const isFinal  = r.round.type === 'final';
        return (
          <div key={r.round.id} className="flex items-center shrink-0">
            <button
              onClick={() => onSelect(r.round.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all',
                isActive && isFinal  ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'       :
                isActive             ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' :
                allDone              ? 'border-slate-700/40 text-slate-500'                        :
                                       'border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400',
              )}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                {meta?.abbr ?? r.round.name}
              </span>
              <span className={cn('text-xs font-black tabular-nums', !isActive && 'text-slate-600')}>
                {r.matches.length}
              </span>
              {allDone && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />}
            </button>
            {idx < knockoutRounds.length - 1 && (
              <ChevronRight className="h-3 w-3 text-slate-700 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function TournamentBracket({ rounds }: { rounds: RoundWithMatches[] }) {

  // Stabilize the rounds reference with a stable identity key so memo/effect
  // don't re-fire when the parent re-renders with structurally identical data.
  const roundsKey = rounds.map(r => `${r.round.id}:${r.matches.map(m => `${m.id}${m.status}`).join(',')}`).join('|');

  const knockoutRounds = useMemo(() =>
    rounds
      .filter(r => KNOCKOUT_ORDER.includes(r.round.type) && r.matches.length > 0)
      .sort((a, b) => KNOCKOUT_ORDER.indexOf(a.round.type) - KNOCKOUT_ORDER.indexOf(b.round.type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundsKey],
  );

  const bracketRounds = useMemo(() =>
    knockoutRounds
      .filter(r => BRACKET_ORDER.includes(r.round.type))
      .sort((a, b) => BRACKET_ORDER.indexOf(a.round.type) - BRACKET_ORDER.indexOf(b.round.type))
      .map(r => ({ ...r, matches: [...r.matches].sort((a, b) => (a.bracket_slot ?? 99) - (b.bracket_slot ?? 99)) })),
    [knockoutRounds],
  );

  const thirdPlace = useMemo(() =>
    knockoutRounds.find(r => r.round.type === 'third_place'),
    [knockoutRounds],
  );

  const finalRound = useMemo(() =>
    knockoutRounds.find(r => r.round.type === 'final'),
    [knockoutRounds],
  );

  const champion = useMemo(() => {
    const fin = finalRound?.matches[0];
    if (!fin?.result) return null;
    const isHomeWin = fin.result.winner === 'home';
    return {
      name: (isHomeWin ? fin.home_team?.name ?? fin.home_placeholder : fin.away_team?.name ?? fin.away_placeholder) ?? null,
      flag: isHomeWin ? fin.home_team?.flag_url : fin.away_team?.flag_url,
    };
  }, [finalRound]);

  // ── activeRoundId: which knockout round is focused ─────────────────────────

  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);

  useEffect(() => {
    if (!knockoutRounds.length) return;
    const inProg   = knockoutRounds.find(r => r.matches.some(m => m.status === 'in_progress'));
    const upcoming = knockoutRounds.find(r => r.matches.some(m => m.status === 'scheduled'));
    setActiveRoundId((inProg ?? upcoming ?? knockoutRounds[knockoutRounds.length - 1]).round.id);
  }, [knockoutRounds]);

  // ── Mobile carousel: all knockout rounds + optional champion entry ─────────

  const carouselEntries = useMemo((): CarouselEntry[] => {
    const entries: CarouselEntry[] = knockoutRounds.map(r => ({ kind: 'round', round: r }));
    if (champion?.name) {
      entries.push({ kind: 'champion', name: champion.name, flag: champion.flag });
    }
    return entries;
  }, [knockoutRounds, champion]);

  // Map activeRoundId → carousel index
  const activeCarouselIdx = useMemo(() => {
    const idx = carouselEntries.findIndex(
      e => e.kind === 'round' && e.round.round.id === activeRoundId,
    );
    return idx >= 0 ? idx : 0;
  }, [carouselEntries, activeRoundId]);

  const handleCarouselSelect = (idx: number) => {
    const entry = carouselEntries[idx];
    if (entry?.kind === 'round') setActiveRoundId(entry.round.round.id);
    else setActiveRoundId(null); // champion panel
  };

  // ── Mobile bracket column index (bracketRounds only) ──────────────────────

  const activeBracketColIdx = useMemo(() => {
    const idx = bracketRounds.findIndex(r => r.round.id === activeRoundId);
    return idx >= 0 ? idx : bracketRounds.length - 1;
  }, [bracketRounds, activeRoundId]);

  const handleMobileColChange = (idx: number) => {
    const r = bracketRounds[idx];
    if (r) setActiveRoundId(r.round.id);
  };

  // ── Show champion panel on mobile? ────────────────────────────────────────

  const showChampionMobile = activeRoundId === null && champion !== null;

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!knockoutRounds.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <GitBranch className="h-10 w-10 text-slate-700 mx-auto" />
        </div>
        <p className="text-slate-500 text-sm font-medium">Fase eliminatoria no disponible</p>
        <p className="text-slate-700 text-xs">Aparecerá cuando el torneo avance a esta fase.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Desktop: compact round strip ──────────────────────────────── */}
      <div className="hidden md:block">
        <DesktopRoundStrip
          knockoutRounds={knockoutRounds}
          activeRoundId={activeRoundId}
          onSelect={setActiveRoundId}
        />
      </div>

      {/* ── Desktop: full bracket ─────────────────────────────────────── */}
      {bracketRounds.length > 0 && (
        <div className="hidden md:block rounded-xl border border-slate-800/50 bg-transparent p-4">
          <DesktopBracket
            bracketRounds={bracketRounds}
            thirdPlace={thirdPlace}
            activeRoundId={activeRoundId}
            onSelectRound={setActiveRoundId}
          />
        </div>
      )}

      {/* ── Mobile: swipeable round carousel ──────────────────────────── */}
      <div className="md:hidden">
        <MobileRoundCarousel
          entries={carouselEntries}
          activeIdx={activeCarouselIdx}
          onSelect={handleCarouselSelect}
        />
      </div>

      {/* ── Mobile: bracket column view ────────────────────────────────── */}
      {bracketRounds.length > 0 && (
        <div className="md:hidden mt-3">
          {showChampionMobile && champion?.name ? (
            <ChampionPanel name={champion.name} flag={champion.flag} />
          ) : (
            <MobileBracket
              bracketRounds={bracketRounds}
              activeColIdx={activeBracketColIdx}
              onChangeColIdx={handleMobileColChange}
            />
          )}
        </div>
      )}

      {/* ── Desktop: champion banner ──────────────────────────────────── */}
      {champion?.name && (
        <div className="hidden md:block">
          <ChampionPanel name={champion.name} flag={champion.flag} />
        </div>
      )}

    </div>
  );
}

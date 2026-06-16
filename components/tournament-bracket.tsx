'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { cn, formatMatchDateParts } from '@/lib/utils';
import type { RoundWithMatches, Match } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, GitBranch, CheckCircle2, ChevronRight, ChevronLeft, Calendar, MapPin, Star, Zap, Award, Crown, Layers } from 'lucide-react';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';

// ── Metadata ───────────────────────────────────────────────────────────────────

const KNOCKOUT_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'];
const BRACKET_ORDER  = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROUND_ICONS: Record<string, React.ElementType<any>> = {
  round_of_32: Layers,
  round_of_16: Layers,
  quarter:     Zap,
  semi:        Star,
  third_place: Award,
  final:       Crown,
  champion:    Trophy,
};

const ROUND_META: Record<string, { label: string; abbr: string }> = {
  round_of_32: { label: 'Dieciseisavos', abbr: 'R32'   },
  round_of_16: { label: 'Octavos',       abbr: 'R16'   },
  quarter:     { label: 'Cuartos',       abbr: 'QF'    },
  semi:        { label: 'Semifinal',     abbr: 'SF'    },
  third_place: { label: 'Tercer puesto', abbr: '3P'    },
  final:       { label: 'Final',         abbr: 'FINAL' },
};

const CARD_BG =
  'https://res.cloudinary.com/dr0klvutj/image/upload/v1781001150/MatchPick/file_00000000042c71fb8d0d570a11881d55.png';

// ── Bracket geometry ───────────────────────────────────────────────────────────

const SLOT_H  = 132;
const CARD_H  = 120; // 104 base + 16 for venue footer row
const COL_W   = 200;
const COL_GAP = 48;
const PAD_X   = 20;
const PAD_Y   = 32;

const COL_W_M            = 260;
const COL_GAP_M          = 36;
const COL_GAP_M_COMPACT  = 16;
const PEEK_PAD           = 10;

// Header height (date/time + status badge row) and footer height (venue row).
// Connector lines target the midpoint of the team-rows area between them.
const CARD_HEADER_H = 22;
const CARD_FOOTER_H = 16;

function matchTop(roundIdx: number, slotIdx: number): number {
  const pow2 = 1 << roundIdx;
  return PAD_Y + slotIdx * pow2 * SLOT_H + ((pow2 - 1) * SLOT_H) / 2 + (SLOT_H - CARD_H) / 2;
}
function matchCenterY(roundIdx: number, slotIdx: number): number {
  // Target the divider between the two team rows, excluding header and venue footer.
  return matchTop(roundIdx, slotIdx) + CARD_HEADER_H + Math.floor((CARD_H - CARD_HEADER_H - CARD_FOOTER_H) / 2);
}
function colX(rIdx: number): number {
  return PAD_X + rIdx * (COL_W + COL_GAP);
}

// ── TeamRow ────────────────────────────────────────────────────────────────────

function TeamRow({
  team, placeholder, score, won, lost, live, hasResult,
}: {
  team: Match['home_team'];
  placeholder: string | null;
  score?: number;
  won: boolean;
  lost: boolean;
  live: boolean;
  hasResult: boolean;
}) {
  const name = team?.short_name ?? team?.name ?? placeholder;
  const flag = team?.flag_url;

  return (
    <div className={cn(
      'flex items-center gap-2 px-2.5 flex-1 min-h-0',
      won && 'bg-emerald-950/50',
    )}>
      <div className={cn('shrink-0 rounded-[3px] overflow-hidden', lost && 'opacity-35')}>
        {flag
          ? <img src={flag} alt="" className="w-[26px] h-[17px] object-cover" />
          : <FlagPlaceholder size="sm" />
        }
      </div>
      <span className={cn(
        'flex-1 text-[11px] font-semibold truncate leading-none',
        !name  ? 'text-slate-600 italic' :
        won    ? 'text-white' :
        lost   ? 'text-slate-600' :
        live   ? 'text-slate-200' : 'text-slate-300',
      )}>
        {name ?? '···'}
      </span>
      <span className={cn(
        'font-mono tabular-nums w-4 text-right shrink-0 font-bold leading-none',
        !hasResult ? 'text-slate-800 text-[10px]' :
        won        ? 'text-emerald-400 text-sm'   :
        lost       ? 'text-slate-600 text-sm'     :
                     'text-slate-300 text-sm',
      )}>
        {hasResult ? (score ?? '?') : '–'}
      </span>
      <div className={cn(
        'w-0.5 h-3.5 rounded-full shrink-0',
        won ? 'bg-emerald-400' : 'bg-transparent',
      )} />
    </div>
  );
}

// ── TreeCard ───────────────────────────────────────────────────────────────────

const TREE_STATUS_LABELS: Record<Match['status'], string> = {
  scheduled:   'Programado',
  in_progress: 'Jugando',
  finished:    'Finalizado',
  cancelled:   'Cancelado',
};

function TreeCard({
  match, active, colW = COL_W, isThirdPlace = false,
  revealed = true, onTap,
}: {
  match: Match; active: boolean; colW?: number; isThirdPlace?: boolean;
  revealed?: boolean; onTap?: () => void;
}) {
  const fin       = match.status === 'finished';
  const live      = match.status === 'in_progress';
  const homeWon   = fin && match.result?.winner === 'home';
  const awayWon   = fin && match.result?.winner === 'away';
  const hasResult = (fin || live) && !!match.result;
  const { date, time } = formatMatchDateParts(match.scheduled_at);

  const statusColor = live ? 'text-red-400' : fin ? 'text-slate-600' : 'text-slate-500';
  const dotColor    = live ? 'bg-red-400 animate-pulse' : fin ? 'bg-slate-600' : 'bg-emerald-500';
  const badgeBorder = live ? 'border-red-500/40' : fin ? 'border-slate-700/60' : 'border-slate-700/40';
  const calColor    = live ? 'text-red-400' : fin ? 'text-slate-600' : 'text-emerald-500';

  // Shared transition for header/footer reveal animation
  const detailTransition = { duration: 0.24, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden flex flex-col transition-colors duration-200 select-none',
        live          ? 'border-red-500/50 shadow-md shadow-red-950/30'           :
        isThirdPlace  ? (active ? 'border-amber-600/60 shadow-sm shadow-amber-950/20' : 'border-amber-800/40') :
        active        ? 'border-emerald-500/40 shadow-sm shadow-emerald-950/20'   :
                        'border-slate-800/80',
        onTap && 'cursor-pointer',
      )}
      style={{ width: colW, height: CARD_H }}
      onClick={onTap}
    >
      {/* Background — fixed size so it doesn't shift */}
      <img
        src={CARD_BG}
        alt="" aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center z-0 pointer-events-none select-none"
        style={{ opacity: 0.06 }}
      />
      <div className="absolute inset-0 z-0 bg-slate-950/91" />

      <div className="relative z-10 flex flex-col h-full">

        {/* Header — date, time, status badge (animated on mobile) */}
        <motion.div
          animate={{ height: revealed ? CARD_HEADER_H : 0 }}
          initial={false}
          transition={detailTransition}
          className="overflow-hidden shrink-0"
        >
          <div className="flex items-center justify-between gap-1 px-2 border-b border-slate-800/60" style={{ height: CARD_HEADER_H }}>
            <div className="flex items-center gap-1 min-w-0">
              <Calendar className={cn('h-2.5 w-2.5 shrink-0', calColor)} />
              <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">{date}</span>
              {time && (
                <>
                  <span className="text-[9px] text-slate-700">·</span>
                  <span className="text-[9px] text-slate-600 whitespace-nowrap">{time}</span>
                </>
              )}
            </div>
            <div className={cn(
              'flex items-center gap-0.5 shrink-0 rounded border px-1 py-px',
              badgeBorder,
            )}>
              <span className={cn('w-1 h-1 rounded-full shrink-0', dotColor)} />
              <span className={cn('text-[8px] font-semibold leading-none', statusColor)}>
                {TREE_STATUS_LABELS[match.status]}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Home row */}
        <TeamRow
          team={match.home_team} placeholder={match.home_placeholder}
          score={match.result?.home_score} won={homeWon} lost={awayWon}
          live={live} hasResult={hasResult}
        />

        {/* Row divider */}
        <div className="h-px bg-slate-800/60 mx-2.5 shrink-0" />

        {/* Away row */}
        <TeamRow
          team={match.away_team} placeholder={match.away_placeholder}
          score={match.result?.away_score} won={awayWon} lost={homeWon}
          live={live} hasResult={hasResult}
        />

        {/* Footer — venue (animated on mobile) */}
        <motion.div
          animate={{ height: revealed ? CARD_FOOTER_H : 0 }}
          initial={false}
          transition={detailTransition}
          className="overflow-hidden shrink-0"
        >
          <div className="flex items-center gap-1 px-2 border-t border-slate-800/40" style={{ height: CARD_FOOTER_H }}>
            {match.venue ? (
              <>
                <MapPin className="h-2 w-2 shrink-0 text-slate-700" />
                <span className="text-[8px] text-slate-600 truncate">{match.venue}</span>
              </>
            ) : null}
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ── Connector SVG ──────────────────────────────────────────────────────────────

function ConnectorLines({
  bracketRounds, totalW, totalH, highlightRoundIdx,
  getColX = colX, colWidth = COL_W, colGap = COL_GAP,
  getMatchCenterY: getY = matchCenterY,
  skipConnectorsAtIdx,
  flip = false,
}: {
  bracketRounds: RoundWithMatches[];
  totalW: number;
  totalH: number;
  highlightRoundIdx?: number;
  getColX?: (rIdx: number) => number;
  colWidth?: number;
  colGap?: number;
  getMatchCenterY?: (rIdx: number, sIdx: number) => number;
  skipConnectorsAtIdx?: Set<number>;
  /** Mirrors the connector direction for a right-to-left (right-half) bracket flow. */
  flip?: boolean;
}) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
      {bracketRounds.slice(0, -1).map((_, rIdx) => {
        if (skipConnectorsAtIdx?.has(rIdx)) return null;
        const nextCount = bracketRounds[rIdx + 1]?.matches.length ?? 0;
        const fromX = flip ? getColX(rIdx) : getColX(rIdx) + colWidth;
        const midX  = flip ? fromX - colGap / 2 : fromX + colGap / 2;
        const toX   = flip ? getColX(rIdx + 1) + colWidth : getColX(rIdx + 1);
        const visible = highlightRoundIdx === undefined
          || rIdx === highlightRoundIdx
          || rIdx + 1 === highlightRoundIdx;

        return Array.from({ length: nextCount }, (_, ps) => {
          const topY = getY(rIdx, ps * 2);
          const botY = getY(rIdx, ps * 2 + 1);
          const midY = (topY + botY) / 2;
          return (
            <g key={`c-${rIdx}-${ps}`}>
              <path
                d={`M ${fromX} ${topY} H ${midX} V ${botY} M ${fromX} ${botY} H ${midX} M ${midX} ${midY} H ${toX}`}
                stroke={visible ? '#1e293b' : '#0f172a'}
                strokeWidth={visible ? 1.5 : 1}
                fill="none"
                strokeLinecap="round"
              />
              {visible && <circle cx={midX} cy={midY} r={2.5} fill="#1e293b" />}
            </g>
          );
        });
      })}
    </svg>
  );
}

// ── Desktop bracket ────────────────────────────────────────────────────────────

function DesktopBracket({
  bracketRounds, thirdPlace, activeRoundId, onSelectRound,
}: {
  bracketRounds: RoundWithMatches[];
  thirdPlace: RoundWithMatches | undefined;
  activeRoundId: number | null;
  onSelectRound: (id: number) => void;
}) {
  const finalRound = bracketRounds[bracketRounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  if (!finalMatch) return null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    dragOrigin.current = { x: e.pageX, scrollLeft: scrollRef.current.scrollLeft };
    setDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragOrigin.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = dragOrigin.current.scrollLeft - (e.pageX - dragOrigin.current.x);
  };
  const stopDrag = () => { dragOrigin.current = null; setDragging(false); };

  const hasTP = !!(thirdPlace && thirdPlace.matches.length > 0);

  // Split every round before the Final into a left half and a right half (by
  // bracket_slot, which is already nested so the first half of each round's
  // slots traces back to the same sub-bracket). Each half is then laid out as
  // its own independent mini-bracket converging on the centered Final, so the
  // connector lines point inward from both edges of the screen toward it.
  const preFinalRounds = bracketRounds.slice(0, -1);
  const numHalfRounds  = preFinalRounds.length;

  const leftRounds: RoundWithMatches[] = preFinalRounds.map(r => ({
    round: r.round,
    matches: r.matches.slice(0, Math.ceil(r.matches.length / 2)),
  }));
  const rightRounds: RoundWithMatches[] = preFinalRounds.map(r => ({
    round: r.round,
    matches: r.matches.slice(Math.ceil(r.matches.length / 2)),
  }));

  const halfFirstCount = leftRounds[0]?.matches.length ?? 0;

  const colXLeft  = (rIdx: number) => PAD_X + rIdx * (COL_W + COL_GAP);
  const colXRight = (rIdx: number) => PAD_X + (2 * numHalfRounds - rIdx) * (COL_W + COL_GAP);
  const colXFinal = PAD_X + numHalfRounds * (COL_W + COL_GAP);

  const bracketH = halfFirstCount > 0
    ? halfFirstCount * SLOT_H + 2 * PAD_Y
    : CARD_H + 2 * PAD_Y;
  const finalCenterY = bracketH / 2;
  const finalTop     = finalCenterY - CARD_H / 2;

  const tpGap  = 28;
  const totalH = hasTP ? bracketH + tpGap + CARD_H + PAD_Y : bracketH;

  const numCols = 2 * numHalfRounds + 1;
  const totalW  = numCols * COL_W + (numCols - 1) * COL_GAP + 2 * PAD_X;

  const renderLabel = (round: RoundWithMatches['round'], x: number, key: string, amber = false) => {
    const Icon = ROUND_ICONS[round.type] ?? Trophy;
    const abbr = ROUND_META[round.type]?.abbr ?? round.name;
    return (
      <div key={key} className="absolute flex items-center justify-center gap-1" style={{ left: x, width: COL_W, top: 6 }}>
        <Icon className={cn('h-2.5 w-2.5 shrink-0', amber ? 'text-amber-700/60' : 'text-slate-600')} />
        <span className={cn('text-[9px] font-semibold uppercase tracking-widest', amber ? 'text-amber-700/60' : 'text-slate-600')}>
          {abbr}
        </span>
      </div>
    );
  };

  const renderCard = (match: Match, x: number, y: number, roundId: number, isThirdPlace = false) => (
    <button
      key={match.id}
      onClick={() => onSelectRound(roundId)}
      className="absolute p-0 focus:outline-none hover:z-10"
      style={{ left: x, top: y, width: COL_W, height: CARD_H }}
    >
      <TreeCard match={match} active={roundId === activeRoundId} isThirdPlace={isThirdPlace} />
    </button>
  );

  return (
    <div
      ref={scrollRef}
      className={cn(
        'overflow-x-auto scrollbar-none',
        dragging ? 'cursor-grabbing select-none [&_*]:!cursor-grabbing' : 'cursor-grab',
      )}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <div className="relative" style={{ width: totalW, height: totalH }}>

        {/* Soft glow anchoring the Final at the visual center */}
        <div
          className="absolute rounded-full bg-emerald-500/5 blur-2xl pointer-events-none"
          style={{ left: colXFinal - 40, top: finalTop - 40, width: COL_W + 80, height: CARD_H + 80 }}
        />

        {/* Column labels — left half, right half (mirrored), Final */}
        {preFinalRounds.map((r, i) => renderLabel(r.round, colXLeft(i), `lbl-l-${r.round.id}`))}
        {preFinalRounds.map((r, i) => renderLabel(r.round, colXRight(i), `lbl-r-${r.round.id}`))}
        {renderLabel(finalRound.round, colXFinal, 'lbl-final')}

        {/* Connector lines — left half flows rightward, right half flows leftward */}
        {numHalfRounds > 0 && (
          <>
            <ConnectorLines bracketRounds={leftRounds} totalW={totalW} totalH={totalH} />
            <ConnectorLines bracketRounds={rightRounds} totalW={totalW} totalH={totalH} getColX={colXRight} flip />
          </>
        )}

        {/* Manual convergence connectors: last semifinal of each half → centered Final */}
        {numHalfRounds > 0 && (() => {
          const lastIdx     = numHalfRounds - 1;
          const leftMatch   = leftRounds[lastIdx]?.matches[0];
          const rightMatch  = rightRounds[lastIdx]?.matches[0];
          if (!leftMatch || !rightMatch) return null;

          const leftFromX  = colXLeft(lastIdx) + COL_W;
          const rightFromX = colXRight(lastIdx);
          const fromY      = matchCenterY(lastIdx, 0);
          const finalLeftX  = colXFinal;
          const finalRightX = colXFinal + COL_W;
          const midL = leftFromX + (finalLeftX - leftFromX) / 2;
          const midR = rightFromX + (finalRightX - rightFromX) / 2;

          return (
            <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
              <path d={`M ${leftFromX} ${fromY} H ${midL} V ${finalCenterY} H ${finalLeftX}`} stroke="#1e293b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
              <path d={`M ${rightFromX} ${fromY} H ${midR} V ${finalCenterY} H ${finalRightX}`} stroke="#1e293b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
              <circle cx={finalLeftX} cy={finalCenterY} r={2.5} fill="#1e293b" />
              <circle cx={finalRightX} cy={finalCenterY} r={2.5} fill="#1e293b" />
            </svg>
          );
        })()}

        {/* Cards — left half */}
        {leftRounds.map((r, rIdx) => r.matches.map((match, sIdx) =>
          renderCard(match, colXLeft(rIdx), matchTop(rIdx, sIdx), r.round.id)
        ))}

        {/* Cards — right half */}
        {rightRounds.map((r, rIdx) => r.matches.map((match, sIdx) =>
          renderCard(match, colXRight(rIdx), matchTop(rIdx, sIdx), r.round.id)
        ))}

        {/* Final card, centered */}
        {renderCard(finalMatch, colXFinal, finalTop, finalRound.round.id)}

        {/* Third place — kept below the Final, detached from the converging flow */}
        {hasTP && thirdPlace!.matches[0] && (
          <>
            {renderLabel(thirdPlace!.round, colXFinal, 'lbl-tp', true)}
            {renderCard(thirdPlace!.matches[0], colXFinal, bracketH + tpGap, thirdPlace!.round.id, true)}
          </>
        )}
      </div>
    </div>
  );
}

// ── Mobile single-column bracket ───────────────────────────────────────────────

function MobileBracket({
  bracketRounds, activeColIdx, onChangeColIdx, thirdPlaceColIdx = -1,
}: {
  bracketRounds: RoundWithMatches[];
  activeColIdx: number;
  onChangeColIdx: (idx: number) => void;
  thirdPlaceColIdx?: number;
}) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Track which match has its details revealed (tap to toggle)
  const [revealedMatchId, setRevealedMatchId] = useState<number | null>(null);

  // Close any revealed card when the active column changes
  useEffect(() => {
    setRevealedMatchId(null);
  }, [activeColIdx]);

  const firstCount = bracketRounds[0]?.matches.length ?? 0;
  if (!firstCount) return null;

  const gapM     = activeColIdx === 0 ? COL_GAP_M : COL_GAP_M_COMPACT;
  const colXMDyn = (rIdx: number) => rIdx * (COL_W_M + gapM);

  const cols        = bracketRounds.length;
  const activeCount = bracketRounds[activeColIdx]?.matches.length ?? firstCount;
  // Height adapts to the active column so later rounds don't leave empty space.
  const totalH = activeCount * SLOT_H + 2 * PAD_Y;
  const totalW = cols * COL_W_M + (cols - 1) * gapM;

  // Normalize card top position relative to activeColIdx.
  // Active column (rel=0)  → compact matchTop(0,…) — no empty gaps.
  // Later columns (rel>0)  → natural bracket spacing (matchTop(rel,…)).
  // Previous columns (rel<0) → compress proportionally into the active column's space.
  const cardTop = (rIdx: number, sIdx: number): number => {
    const rel = rIdx - activeColIdx;
    if (rel >= 0) return matchTop(rel, sIdx);
    const inv = 1 << (-rel);
    const parentSIdx = Math.floor(sIdx / inv);
    const offset = (sIdx % inv) - (inv - 1) / 2;
    return matchTop(0, parentSIdx) + Math.round(offset * SLOT_H / inv);
  };

  const cardCenterY = (rIdx: number, sIdx: number): number =>
    cardTop(rIdx, sIdx) + CARD_HEADER_H + Math.floor((CARD_H - CARD_HEADER_H - CARD_FOOTER_H) / 2);

  const offsetX = PEEK_PAD - colXMDyn(activeColIdx);

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
    if (Math.abs(dy) * 0.5 >= Math.abs(dx)) return;
    const threshold = COL_W_M * 0.2;
    if (dx < -threshold && activeColIdx < bracketRounds.length - 1) onChangeColIdx(activeColIdx + 1);
    if (dx >  threshold && activeColIdx > 0)                         onChangeColIdx(activeColIdx - 1);
  };

  const onTouchCancel = () => {
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="relative rounded-xl"
      style={{ overflowX: 'clip' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {/* Canvas pans horizontally (x) and compresses vertically (height) as rounds advance */}
      <motion.div
        className="relative overflow-hidden"
        animate={{ x: offsetX, height: totalH }}
        initial={false}
        transition={{
          x:      { type: 'spring', stiffness: 280, damping: 32 },
          height: { type: 'spring', stiffness: 160, damping: 26 },
        }}
        style={{ width: totalW }}
      >
        <ConnectorLines
          bracketRounds={bracketRounds}
          totalW={totalW}
          totalH={totalH}
          highlightRoundIdx={activeColIdx}
          getColX={colXMDyn}
          colWidth={COL_W_M}
          colGap={gapM}
          getMatchCenterY={cardCenterY}
          skipConnectorsAtIdx={
            thirdPlaceColIdx >= 0
              ? new Set([thirdPlaceColIdx - 1, thirdPlaceColIdx])
              : undefined
          }
        />

        {bracketRounds.map((r, rIdx) =>
          r.matches.map((match, sIdx) => (
            <div
              key={match.id}
              className="absolute"
              style={{
                left: colXMDyn(rIdx),
                top: cardTop(rIdx, sIdx),
                // Springy ease for vertical compression; linear ease-out for horizontal gap change
                transition: 'top 0.5s cubic-bezier(0.34, 1.2, 0.64, 1), left 0.3s ease-out',
              }}
            >
              <TreeCard
                match={match}
                active={rIdx === activeColIdx}
                colW={COL_W_M}
                isThirdPlace={rIdx === thirdPlaceColIdx}
                revealed={revealedMatchId === match.id}
                onTap={() => setRevealedMatchId(prev => prev === match.id ? null : match.id)}
              />
            </div>
          ))
        )}
      </motion.div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-slate-950/70 to-transparent z-10 rounded-l-xl" />
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

// ── Mobile round nav (step rail) ───────────────────────────────────────────────

type CarouselEntry =
  | { kind: 'round'; round: RoundWithMatches }
  | { kind: 'champion'; name: string; flag?: string | null };

function MobileRoundCarousel({
  entries, activeIdx, onSelect,
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
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIdx]);

  return (
    <div className="relative px-4">
      {/* Fade hint — more content on the right */}
      <div className="pointer-events-none absolute right-0 inset-y-0 w-12 bg-gradient-to-l from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute left-0 inset-y-0 w-4 bg-gradient-to-r from-slate-950 to-transparent z-10" />

      <div ref={scrollRef} className="flex items-center overflow-x-auto scrollbar-none">
        {entries.map((entry, i) => {
          const isActive  = i === activeIdx;
          const isPast    = i < activeIdx;
          const type      = entry.kind === 'round' ? entry.round.round.type : 'champion';
          const abbr      = entry.kind === 'champion'
            ? 'CAM'
            : (ROUND_META[type]?.abbr ?? (entry as { round: RoundWithMatches }).round.round.name);
          const Icon      = ROUND_ICONS[type] ?? Trophy;
          const isSpecial = type === 'final' || type === 'champion';
          const is3P      = type === 'third_place';
          const hasLive   = entry.kind === 'round' && entry.round.matches.some(m => m.status === 'in_progress');
          const allDone   = entry.kind === 'round' && entry.round.matches.every(m => m.status === 'finished');

          const accentColor =
            isSpecial ? 'bg-amber-500/70'   :
            is3P      ? 'bg-amber-600/50'   :
            hasLive   ? 'bg-red-500/70'     :
                        'bg-emerald-500/70';

          const iconColor =
            isActive && isSpecial ? 'text-amber-400' :
            isActive && is3P      ? 'text-amber-500/80' :
            isActive && hasLive   ? 'text-red-400'   :
            isActive              ? 'text-emerald-400' :
            isPast                ? 'text-slate-600'  :
                                    'text-slate-700';

          const textColor =
            isActive && isSpecial ? 'text-amber-300' :
            isActive && is3P      ? 'text-amber-400/80' :
            isActive && hasLive   ? 'text-red-300'   :
            isActive              ? 'text-emerald-300' :
            isPast                ? 'text-slate-600'  :
                                    'text-slate-700';

          return (
            <div key={i} className="flex items-center shrink-0">
              {/* Progress connector between pills */}
              {i > 0 && (
                <div className={cn(
                  'h-px transition-all duration-300',
                  i <= activeIdx ? 'w-5 bg-slate-600' : 'w-4 bg-slate-800',
                )} />
              )}

              {/* Step pill */}
              <button
                onClick={() => onSelect(i)}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 rounded-xl transition-all duration-200 focus:outline-none',
                  'px-3 py-2.5 min-w-[52px]',
                  isActive
                    ? isSpecial ? 'bg-amber-950/50'   :
                      is3P      ? 'bg-amber-950/30'   :
                      hasLive   ? 'bg-red-950/30'     :
                                  'bg-emerald-950/50'
                    : 'bg-transparent hover:bg-slate-900/50',
                )}
              >
                {/* Icon with live pulse overlay */}
                <div className="relative">
                  <Icon className={cn('h-4 w-4 transition-colors', iconColor)} />
                  {hasLive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>

                {/* Abbreviation */}
                <span className={cn('text-[9px] font-bold tracking-widest whitespace-nowrap transition-colors leading-none', textColor)}>
                  {abbr}
                </span>

                {/* Done badge */}
                {allDone && !hasLive && !isActive && (
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-700 mt-0.5" />
                )}

                {/* Active bottom accent line */}
                {isActive && (
                  <div className={cn('absolute bottom-0 left-2 right-2 h-0.5 rounded-full', accentColor)} />
                )}
              </button>
            </div>
          );
        })}
        <div className="shrink-0 w-10" />
      </div>
    </div>
  );
}

// ── Desktop round strip ────────────────────────────────────────────────────────

function DesktopRoundStrip({
  knockoutRounds, activeRoundId, onSelect,
}: {
  knockoutRounds: RoundWithMatches[];
  activeRoundId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
      {knockoutRounds.map((r, idx) => {
        const meta     = ROUND_META[r.round.type];
        const Icon     = ROUND_ICONS[r.round.type] ?? Trophy;
        const isActive = activeRoundId === r.round.id;
        const allDone  = r.matches.every(m => m.status === 'finished');
        const live     = r.matches.some(m => m.status === 'in_progress');
        const isFinal  = r.round.type === 'final';
        const is3P     = r.round.type === 'third_place';
        return (
          <div key={r.round.id} className="flex items-center shrink-0">
            <button
              onClick={() => onSelect(r.round.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-150',
                isActive && (isFinal || is3P) ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'   :
                isActive                       ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                live                           ? 'border-red-500/20 text-red-500/70'                        :
                allDone                        ? 'border-transparent text-slate-600'                        :
                                                 'border-transparent text-slate-600 hover:text-slate-400',
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
                {meta?.abbr ?? r.round.name}
              </span>
              {live    && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {allDone && !live && <CheckCircle2 className="h-3 w-3 text-emerald-700 shrink-0" />}
            </button>
            {idx < knockoutRounds.length - 1 && (
              <div className="w-4 h-px bg-slate-800 mx-0.5 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function TournamentBracket({ rounds }: { rounds: RoundWithMatches[] }) {

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

  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
  const [swipeHintDone, setSwipeHintDone] = useState(false);

  useEffect(() => {
    if (!knockoutRounds.length) return;
    const inProg   = knockoutRounds.find(r => r.matches.some(m => m.status === 'in_progress'));
    const upcoming = knockoutRounds.find(r => r.matches.some(m => m.status === 'scheduled'));
    setActiveRoundId((inProg ?? upcoming ?? knockoutRounds[knockoutRounds.length - 1]).round.id);
  }, [knockoutRounds]);

  // Show swipe hint briefly on mount if there are multiple bracket columns
  useEffect(() => {
    if (swipeHintDone) return;
    const t = setTimeout(() => setSwipeHintDone(true), 3000);
    return () => clearTimeout(t);
  }, [swipeHintDone]);

  const carouselEntries = useMemo((): CarouselEntry[] => {
    const entries: CarouselEntry[] = knockoutRounds.map(r => ({ kind: 'round', round: r }));
    if (champion?.name) entries.push({ kind: 'champion', name: champion.name, flag: champion.flag });
    return entries;
  }, [knockoutRounds, champion]);

  const activeCarouselIdx = useMemo(() => {
    const idx = carouselEntries.findIndex(e => e.kind === 'round' && e.round.round.id === activeRoundId);
    return idx >= 0 ? idx : 0;
  }, [carouselEntries, activeRoundId]);

  const handleCarouselSelect = (idx: number) => {
    const entry = carouselEntries[idx];
    if (entry?.kind === 'round') setActiveRoundId(entry.round.round.id);
    else setActiveRoundId(null);
  };

  // For mobile: insert thirdPlace between SF and Final so it's a swipeable column.
  const allBracketRounds = useMemo(() => {
    if (!thirdPlace || bracketRounds.length < 2) return bracketRounds;
    return [
      ...bracketRounds.slice(0, -1),
      thirdPlace,
      bracketRounds[bracketRounds.length - 1],
    ];
  }, [bracketRounds, thirdPlace]);

  const thirdPlaceColIdx = useMemo(() =>
    thirdPlace ? allBracketRounds.findIndex(r => r.round.id === thirdPlace.round.id) : -1,
    [allBracketRounds, thirdPlace],
  );

  const activeBracketColIdx = useMemo(() => {
    const idx = allBracketRounds.findIndex(r => r.round.id === activeRoundId);
    return idx >= 0 ? idx : allBracketRounds.length - 1;
  }, [allBracketRounds, activeRoundId]);

  const handleMobileColChange = (idx: number) => {
    const r = allBracketRounds[idx];
    if (r) setActiveRoundId(r.round.id);
  };

  const showChampionMobile = activeRoundId === null && champion !== null;

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

      {/* Desktop: round strip */}
      <div className="hidden md:block">
        <DesktopRoundStrip
          knockoutRounds={knockoutRounds}
          activeRoundId={activeRoundId}
          onSelect={setActiveRoundId}
        />
      </div>

      {/* Desktop: full bracket */}
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

      {/* Desktop: champion */}
      {champion?.name && (
        <div className="hidden md:block">
          <ChampionPanel name={champion.name} flag={champion.flag} />
        </div>
      )}

      {/* Mobile: round carousel */}
      <div className="md:hidden">
        <MobileRoundCarousel
          entries={carouselEntries}
          activeIdx={activeCarouselIdx}
          onSelect={handleCarouselSelect}
        />
      </div>

      {/* Mobile: bracket */}
      {bracketRounds.length > 0 && (
        <div className="md:hidden mt-3 space-y-3">
          {showChampionMobile && champion?.name ? (
            <ChampionPanel name={champion.name} flag={champion.flag} />
          ) : (
            <>
              <MobileBracket
                bracketRounds={allBracketRounds}
                activeColIdx={activeBracketColIdx}
                onChangeColIdx={handleMobileColChange}
                thirdPlaceColIdx={thirdPlaceColIdx}
              />

              {/* Dot pagination — swipe affordance */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {allBracketRounds.length > 1 && (
                  <>
                    <button
                      onClick={() => activeBracketColIdx > 0 && handleMobileColChange(activeBracketColIdx - 1)}
                      disabled={activeBracketColIdx === 0}
                      className="p-1 text-slate-700 hover:text-slate-500 disabled:opacity-0 transition-all"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {allBracketRounds.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => handleMobileColChange(i)}
                          className={cn(
                            'rounded-full transition-all duration-300',
                            i === activeBracketColIdx
                              ? 'w-4 h-1.5 bg-emerald-500/80'
                              : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-600',
                          )}
                          aria-label={`Ir a ronda ${i + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => activeBracketColIdx < allBracketRounds.length - 1 && handleMobileColChange(activeBracketColIdx + 1)}
                      disabled={activeBracketColIdx === allBracketRounds.length - 1}
                      className="p-1 text-slate-700 hover:text-slate-500 disabled:opacity-0 transition-all"
                      aria-label="Siguiente"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* One-time swipe hint */}
              <AnimatePresence>
                {!swipeHintDone && allBracketRounds.length > 1 && activeBracketColIdx < allBracketRounds.length - 1 && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex items-center justify-center gap-1.5 text-[10px] text-slate-700 select-none"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Desliza para navegar las rondas
                    <ChevronRight className="h-3 w-3" />
                  </motion.p>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

    </div>
  );
}

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { cn, formatMatchDateParts } from '@/lib/utils';
import type { RoundWithMatches, Match } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, GitBranch, CheckCircle2, ChevronRight, ChevronLeft, Calendar, MapPin, Star, Zap, Award, Crown, Layers, Maximize2, Minus, Plus, X } from 'lucide-react';
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
  round_of_32: { label: 'Dieciseisavos', abbr: 'Dieciseisavos' },
  round_of_16: { label: 'Octavos',       abbr: 'Octavos'       },
  quarter:     { label: 'Cuartos',       abbr: 'Cuartos'       },
  semi:        { label: 'Semifinal',     abbr: 'Semifinal'     },
  third_place: { label: 'Tercer puesto', abbr: '3P'            },
  final:       { label: 'Final',         abbr: 'Final'         },
};

const CARD_BG =
  'https://res.cloudinary.com/dr0klvutj/image/upload/v1781001150/MatchPick/file_00000000042c71fb8d0d570a11881d55.png';

// ── Bracket geometry ───────────────────────────────────────────────────────────

const SLOT_H  = 104;
const CARD_H  = 92;
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

// ── Desktop split-bracket geometry — compact to fit on screen without scrolling ─

const D_COL_W   = 148;
const D_CARD_H  = 60;
const D_SLOT_H  = 78;
const D_COL_GAP = 20;
const D_PAD_X   = 16;
const D_PAD_Y   = 28;
// Final card is slightly wider than regular cards, using part of the side gaps.
const D_FINAL_W   = D_COL_W + D_COL_GAP;

// ── TeamRow ────────────────────────────────────────────────────────────────────

function TeamRow({
  team, placeholder, score, penScore, won, lost, live, hasResult,
}: {
  team: Match['home_team'];
  placeholder: string | null;
  score?: number;
  penScore?: number | null;
  won: boolean;
  lost: boolean;
  live: boolean;
  hasResult: boolean;
}) {
  const name = team?.name ?? team?.short_name ?? placeholder;
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
      {penScore != null && (
        <span className={cn(
          'text-[9px] font-mono tabular-nums leading-none font-normal shrink-0',
          won ? 'text-slate-500' : 'text-slate-700',
        )}>
          ({penScore})
        </span>
      )}
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
  postponed:   'Aplazado',
  suspended:   'Suspendido',
  paused:      'Pausado',
  rescheduled: 'Reagendado',
};

function TreeCard({
  match, active, colW = COL_W, isThirdPlace = false, isFinal = false,
}: {
  match: Match; active: boolean; colW?: number; isThirdPlace?: boolean; isFinal?: boolean;
}) {
  const fin            = match.status === 'finished';
  const live           = match.status === 'in_progress';
  const penaltyDecided = fin && match.result?.home_score_penalties != null;
  const homeWon        = fin && (match.result?.winner === 'home' || (penaltyDecided && match.result!.home_score_penalties! > match.result!.away_score_penalties!));
  const awayWon        = fin && (match.result?.winner === 'away' || (penaltyDecided && match.result!.away_score_penalties! > match.result!.home_score_penalties!));
  const hasResult      = (fin || live) && !!match.result;
  const { date, time } = formatMatchDateParts(match.scheduled_at);

  const statusColor = live ? 'text-red-400' : fin ? 'text-slate-600' : 'text-slate-500';
  const dotColor    = live ? 'bg-red-400 animate-pulse' : fin ? 'bg-slate-600' : 'bg-emerald-500';
  const badgeBorder = live ? 'border-red-500/40' : fin ? 'border-slate-700/60' : 'border-slate-700/40';
  const calColor    = live ? 'text-red-400' : fin ? 'text-slate-600' : 'text-emerald-500';

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden flex flex-col transition-colors duration-200 select-none',
        live         ? 'border-red-500/50 shadow-md shadow-red-950/30'                                            :
        isFinal      ? (active ? 'border-yellow-500/60 shadow-sm shadow-yellow-950/20' : 'border-yellow-700/35') :
        isThirdPlace ? (active ? 'border-orange-700/60 shadow-sm shadow-orange-950/20' : 'border-orange-800/40') :
        active       ? 'border-emerald-500/40 shadow-sm shadow-emerald-950/20'                                   :
                       'border-slate-800/80',
      )}
      style={{ width: colW, height: CARD_H }}
    >
      {/* Background */}
      <img
        src={CARD_BG}
        alt="" aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center z-0 pointer-events-none select-none"
        style={{ opacity: 0.06 }}
      />
      <div className="absolute inset-0 z-0 bg-slate-950/91" />

      <div className="relative z-10 flex flex-col h-full">

        {/* Header — date, time, status badge */}
        <div className="flex items-center justify-between gap-1 px-2 border-b border-slate-800/60 shrink-0" style={{ height: CARD_HEADER_H }}>
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <Calendar className={cn('h-2.5 w-2.5 shrink-0', calColor)} />
            <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">{date}</span>
            {time && (
              <>
                <span className="text-[9px] text-slate-700">·</span>
                <span className="text-[9px] text-slate-600 whitespace-nowrap">{time}</span>
              </>
            )}
          </div>
          <div className={cn('flex items-center gap-0.5 shrink-0 rounded border px-1 py-px', badgeBorder)}>
            <span className={cn('w-1 h-1 rounded-full shrink-0', dotColor)} />
            <span className={cn('text-[8px] font-semibold leading-none', statusColor)}>
              {TREE_STATUS_LABELS[match.status]}
            </span>
          </div>
        </div>

        {/* Home row */}
        <TeamRow
          team={match.home_team} placeholder={match.home_placeholder}
          score={match.result?.home_score}
          penScore={penaltyDecided ? match.result!.home_score_penalties : null}
          won={homeWon} lost={awayWon} live={live} hasResult={hasResult}
        />

        {/* Row divider */}
        <div className="h-px bg-slate-800/60 mx-2.5 shrink-0" />

        {/* Away row */}
        <TeamRow
          team={match.away_team} placeholder={match.away_placeholder}
          score={match.result?.away_score}
          penScore={penaltyDecided ? match.result!.away_score_penalties : null}
          won={awayWon} lost={homeWon} live={live} hasResult={hasResult}
        />

        {/* Footer — venue */}
        <div className="flex items-center gap-1 px-2 border-t border-slate-800/40 shrink-0" style={{ height: CARD_FOOTER_H }}>
          {match.venue ? (
            <>
              <MapPin className="h-2 w-2 shrink-0 text-slate-700" />
              <span className="text-[8px] text-slate-600 truncate">{match.venue}</span>
            </>
          ) : null}
        </div>

      </div>
    </div>
  );
}

// ── Desktop bracket sub-components ────────────────────────────────────────────

function DesktopTeamRow({
  team, placeholder, score, penScore, won, lost, live, hasResult,
}: {
  team: Match['home_team'];
  placeholder: string | null;
  score?: number;
  penScore?: number | null;
  won: boolean;
  lost: boolean;
  live: boolean;
  hasResult: boolean;
}) {
  const name = team?.name ?? team?.short_name ?? placeholder;
  const flag = team?.flag_url;
  return (
    <div className={cn('flex items-center gap-1.5 px-2 flex-1 min-h-0 text-left', won && 'bg-emerald-950/40')}>
      <div className={cn('shrink-0 rounded-[2px] overflow-hidden', lost && 'opacity-30')}>
        {flag
          ? <img src={flag} alt="" className="w-5 h-[13px] object-cover" />
          : <FlagPlaceholder size="xs" />
        }
      </div>
      <span className={cn(
        'flex-1 text-[10px] font-semibold truncate leading-none',
        !name ? 'text-slate-600 italic' :
        won   ? 'text-white' : lost ? 'text-slate-600' : live ? 'text-slate-200' : 'text-slate-300',
      )}>
        {name ?? '···'}
      </span>
      {won && <div className="w-px h-3 rounded-full bg-emerald-400 shrink-0" />}
      <span className={cn(
        'font-mono tabular-nums shrink-0 font-bold leading-none',
        !hasResult ? 'text-slate-800 text-[9px]' :
        won        ? 'text-emerald-400 text-[11px]' :
        lost       ? 'text-slate-600 text-[11px]'  :
                     'text-slate-300 text-[11px]',
      )}>
        {hasResult ? (score ?? '?') : '–'}
      </span>
      {penScore != null && (
        <span className={cn(
          'text-[8px] font-mono tabular-nums leading-none font-normal shrink-0',
          won ? 'text-slate-500' : 'text-slate-700',
        )}>
          ({penScore})
        </span>
      )}
    </div>
  );
}

function DesktopMatchCard({
  match, roundId, active, isThirdPlace = false, roundLabel, dragging, onSelect, onHover, cardW = D_COL_W,
}: {
  match: Match; roundId: number; active: boolean; isThirdPlace?: boolean; roundLabel?: string;
  dragging: boolean; onSelect: (id: number) => void; onHover: (m: Match | null) => void; cardW?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const fin            = match.status === 'finished';
  const live           = match.status === 'in_progress';
  const penaltyDecided = fin && match.result?.home_score_penalties != null;
  const homeWon        = fin && (match.result?.winner === 'home' || (penaltyDecided && match.result!.home_score_penalties! > match.result!.away_score_penalties!));
  const awayWon        = fin && (match.result?.winner === 'away' || (penaltyDecided && match.result!.away_score_penalties! > match.result!.home_score_penalties!));
  const hasResult      = (fin || live) && !!match.result;
  const { date, time } = formatMatchDateParts(match.scheduled_at);
  const statusColor = live ? 'text-red-400'     : fin ? 'text-slate-600'    : 'text-slate-500';
  const dotColor    = live ? 'bg-red-400 animate-pulse' : fin ? 'bg-slate-600' : 'bg-emerald-500';
  const badgeBorder = live ? 'border-red-500/40' : fin ? 'border-slate-700/60' : 'border-slate-700/40';
  const calColor    = live ? 'text-red-400'     : fin ? 'text-slate-600'    : 'text-emerald-500';
  const handleEnter = () => { if (!dragging) { setHovered(true); onHover(match); } };
  const handleLeave = () => { setHovered(false); onHover(null); };
  return (
    <button
      style={{ width: cardW, height: D_CARD_H }}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border transition-all duration-150 focus:outline-none',
        live         ? 'border-red-500/50 shadow-md shadow-red-950/30'             :
        isThirdPlace ? (active ? 'border-orange-700/50' : 'border-orange-900/40') :
        hovered      ? 'border-slate-600/60 shadow-md shadow-slate-900/50'         :
        active       ? 'border-emerald-500/30'                                     : 'border-slate-800/70',
      )}
      onClick={() => onSelect(roundId)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="flex items-center justify-between gap-1 px-2 border-b border-slate-800/60 shrink-0" style={{ height: 16 }}>
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {roundLabel && <span className="text-[7px] font-black uppercase tracking-wider text-amber-700/80 shrink-0 border border-amber-800/40 rounded px-0.5 leading-none py-px">{roundLabel}</span>}
          <Calendar className={cn('h-2 w-2 shrink-0', calColor)} />
          {date && <span className="text-[8px] text-slate-500 font-medium whitespace-nowrap">{date}</span>}
          {time && <><span className="text-[8px] text-slate-700">·</span><span className="text-[8px] text-slate-600 whitespace-nowrap">{time}</span></>}
        </div>
        <div className={cn('flex items-center shrink-0 rounded-full border p-0.5', badgeBorder)}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
        </div>
      </div>
      <DesktopTeamRow team={match.home_team} placeholder={match.home_placeholder} score={match.result?.home_score} penScore={penaltyDecided ? match.result!.home_score_penalties : null} won={homeWon} lost={awayWon} live={live} hasResult={hasResult} />
      <div className="h-px bg-slate-800/60 mx-2 shrink-0" />
      <DesktopTeamRow team={match.away_team} placeholder={match.away_placeholder} score={match.result?.away_score} penScore={penaltyDecided ? match.result!.away_score_penalties : null} won={awayWon} lost={homeWon} live={live} hasResult={hasResult} />
      <div className="flex items-center gap-1 px-2 border-t border-slate-800/40 shrink-0" style={{ height: 12 }}>
        {match.venue && <><MapPin className="h-[7px] w-[7px] shrink-0 text-slate-700" /><span className="text-[7px] text-slate-600 truncate">{match.venue}</span></>}
      </div>
    </button>
  );
}

function DesktopFinalCard({
  match, roundId, active, dragging, onSelect, onHover,
}: {
  match: Match; roundId: number; active: boolean;
  dragging: boolean; onSelect: (id: number) => void; onHover: (m: Match | null) => void;
}) {
  const fin            = match.status === 'finished';
  const live           = match.status === 'in_progress';
  const penaltyDecided = fin && match.result?.home_score_penalties != null;
  const homeWon        = fin && (match.result?.winner === 'home' || (penaltyDecided && match.result!.home_score_penalties! > match.result!.away_score_penalties!));
  const awayWon        = fin && (match.result?.winner === 'away' || (penaltyDecided && match.result!.away_score_penalties! > match.result!.home_score_penalties!));
  const hasResult      = (fin || live) && !!match.result;
  const { date, time } = formatMatchDateParts(match.scheduled_at);
  const statusColor = live ? 'text-red-400'     : fin ? 'text-slate-600'    : 'text-yellow-600/70';
  const dotColor    = live ? 'bg-red-400 animate-pulse' : fin ? 'bg-slate-600' : 'bg-yellow-500';
  const badgeBorder = live ? 'border-red-500/40' : fin ? 'border-slate-700/60' : 'border-yellow-700/40';
  const calColor    = live ? 'text-red-400'     : fin ? 'text-slate-600'    : 'text-yellow-500/70';
  return (
    <button
      style={{ width: D_FINAL_W, height: D_CARD_H }}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border transition-all duration-150 focus:outline-none',
        live   ? 'border-red-500/60 shadow-lg shadow-red-950/30'             :
        active ? 'border-yellow-400/60 shadow-md shadow-yellow-950/30'       :
                 'border-yellow-700/35',
      )}
      onClick={() => onSelect(roundId)}
      onMouseEnter={() => !dragging && onHover(match)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center justify-between gap-1 px-2 border-b border-yellow-800/30 shrink-0" style={{ height: 16 }}>
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <Calendar className={cn('h-2 w-2 shrink-0', calColor)} />
          {date && <span className="text-[8px] text-yellow-800/70 font-medium whitespace-nowrap">{date}</span>}
          {time && <><span className="text-[8px] text-yellow-800/40">·</span><span className="text-[8px] text-yellow-800/60 whitespace-nowrap">{time}</span></>}
        </div>
        <div className={cn('flex items-center shrink-0 rounded-full border p-0.5', badgeBorder)}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
        </div>
      </div>
      <DesktopTeamRow team={match.home_team} placeholder={match.home_placeholder} score={match.result?.home_score} penScore={penaltyDecided ? match.result!.home_score_penalties : null} won={homeWon} lost={awayWon} live={live} hasResult={hasResult} />
      <div className="h-px bg-yellow-800/25 mx-2.5 shrink-0" />
      <DesktopTeamRow team={match.away_team} placeholder={match.away_placeholder} score={match.result?.away_score} penScore={penaltyDecided ? match.result!.away_score_penalties : null} won={awayWon} lost={homeWon} live={live} hasResult={hasResult} />
      <div className="flex items-center gap-1 px-2 border-t border-yellow-800/20 shrink-0" style={{ height: 12 }}>
        {match.venue ? (
          <><MapPin className="h-[7px] w-[7px] shrink-0 text-yellow-800/40" /><span className="text-[7px] text-yellow-800/60 truncate">{match.venue}</span></>
        ) : null}
      </div>
    </button>
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
          const topDone = bracketRounds[rIdx]?.matches[ps * 2]?.status === 'finished';
          const botDone = bracketRounds[rIdx]?.matches[ps * 2 + 1]?.status === 'finished';
          const bothDone = topDone && botDone;
          return (
            <g key={`c-${rIdx}-${ps}`}>
              {/* Base path */}
              <path
                d={`M ${fromX} ${topY} H ${midX} V ${botY} M ${fromX} ${botY} H ${midX} M ${midX} ${midY} H ${toX}`}
                stroke={visible ? '#1e293b' : '#0f172a'}
                strokeWidth={visible ? 1.5 : 1}
                fill="none"
                strokeLinecap="round"
              />
              {/* Winner-path highlights */}
              {visible && topDone && (
                <path d={`M ${fromX} ${topY} H ${midX}`} stroke="#10b981" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.65} />
              )}
              {visible && botDone && (
                <path d={`M ${fromX} ${botY} H ${midX}`} stroke="#10b981" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.65} />
              )}
              {visible && bothDone && (
                <>
                  <path d={`M ${midX} ${topY} V ${botY}`} stroke="#10b981" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.65} />
                  <path d={`M ${midX} ${midY} H ${toX}`} stroke="#10b981" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.65} />
                </>
              )}
              <circle cx={midX} cy={midY} r={2.5} fill={visible && bothDone ? '#10b981' : visible ? '#1e293b' : '#0f172a'} opacity={visible && bothDone ? 0.65 : 1} />
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
  // All hooks must come before any early return
  const scrollRef    = useRef<HTMLDivElement>(null);
  const dragOrigin   = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [dragging, setDragging]         = useState(false);
  const [hoveredMatch, setHoveredMatch] = useState<Match | null>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    dragOrigin.current = { x: e.pageX, scrollLeft: scrollRef.current.scrollLeft };
    setDragging(true);
    setHoveredMatch(null);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragOrigin.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = dragOrigin.current.scrollLeft - (e.pageX - dragOrigin.current.x);
  };
  const stopDrag = () => { dragOrigin.current = null; setDragging(false); };

  const finalRound = bracketRounds[bracketRounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  if (!finalMatch) return null;

  const hasTP = !!(thirdPlace && thirdPlace.matches.length > 0);

  // Split pre-final rounds into left/right halves — bracket_slot ordering ensures
  // that the first half of each round's slots traces back to the same sub-bracket.
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

  // Desktop geometry helpers (use D_* constants, not the mobile-sized ones)
  const dMatchTop = (rIdx: number, sIdx: number): number => {
    const pow2 = 1 << rIdx;
    return D_PAD_Y + sIdx * pow2 * D_SLOT_H + ((pow2 - 1) * D_SLOT_H) / 2 + (D_SLOT_H - D_CARD_H) / 2;
  };
  const dMatchCY = (rIdx: number, sIdx: number) => dMatchTop(rIdx, sIdx) + D_CARD_H / 2;

  const dColXLeft  = (rIdx: number) => D_PAD_X + rIdx * (D_COL_W + D_COL_GAP);
  const dColXRight = (rIdx: number) => D_PAD_X + (2 * numHalfRounds - rIdx) * (D_COL_W + D_COL_GAP);
  const dColXFinal = D_PAD_X + numHalfRounds * (D_COL_W + D_COL_GAP);

  // Final card vertically centered in the bracket area
  const minBracketH = D_CARD_H + 2 * D_PAD_Y;
  const bracketH = Math.max(
    halfFirstCount > 0 ? halfFirstCount * D_SLOT_H + 2 * D_PAD_Y : minBracketH,
    minBracketH,
  );
  const finalTop     = bracketH / 2 - D_CARD_H / 2;
  const finalCenterY = finalTop + D_CARD_H / 2;

  // Final card positioned so it extends D_COL_GAP/2 into each side gap
  const finalCardLeft = dColXFinal - D_COL_GAP / 2;

  const tpGap  = 26;
  const tpTop  = finalTop + D_CARD_H + tpGap;
  const totalH = Math.max(bracketH, hasTP ? tpTop + D_CARD_H + D_PAD_Y : 0);
  const numCols = 2 * numHalfRounds + 1;
  const totalW  = numCols * D_COL_W + (numCols - 1) * D_COL_GAP + 2 * D_PAD_X;

  const renderLabel = (round: RoundWithMatches['round'], x: number, w: number, key: string, amber = false) => {
    const Icon = ROUND_ICONS[round.type] ?? Trophy;
    const abbr = ROUND_META[round.type]?.abbr ?? round.name;
    return (
      <div key={key} className="absolute flex items-center justify-center gap-1" style={{ left: x, width: w, top: 5 }}>
        <Icon className={cn('h-2.5 w-2.5 shrink-0', amber ? 'text-amber-700/60' : 'text-slate-600')} />
        <span className={cn('text-[9px] font-semibold uppercase tracking-widest', amber ? 'text-amber-700/60' : 'text-slate-600')}>
          {abbr}
        </span>
      </div>
    );
  };

  // Info bar data for currently-hovered match
  const { date: infoDate = null, time: infoTime = null } = hoveredMatch
    ? formatMatchDateParts(hoveredMatch.scheduled_at)
    : {};

  return (
    <div className="flex flex-col">

      {/* Drag-scrollable bracket canvas */}
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
        <div
          className={cn('relative', dragging && 'pointer-events-none')}
          style={{ width: totalW, height: totalH }}
        >

          {/* Ambient glow behind the Final area */}
          <div
            className="absolute rounded-full bg-yellow-500/6 blur-3xl pointer-events-none"
            style={{ left: finalCardLeft - 24, top: finalTop - 16, width: D_FINAL_W + 48, height: D_CARD_H + 32 }}
          />

          {/* Column labels */}
          {preFinalRounds.map((r, i) => renderLabel(r.round, dColXLeft(i),  D_COL_W,   `lbl-l-${r.round.id}`))}
          {preFinalRounds.map((r, i) => renderLabel(r.round, dColXRight(i), D_COL_W,   `lbl-r-${r.round.id}`))}
          {renderLabel(finalRound.round, finalCardLeft, D_FINAL_W, 'lbl-final')}

          {/* Bracket connector lines — left half (L→R) and right half (R→L, flipped) */}
          {numHalfRounds > 0 && (
            <>
              <ConnectorLines bracketRounds={leftRounds}  totalW={totalW} totalH={totalH} getColX={dColXLeft}  colWidth={D_COL_W} colGap={D_COL_GAP} getMatchCenterY={dMatchCY} />
              <ConnectorLines bracketRounds={rightRounds} totalW={totalW} totalH={totalH} getColX={dColXRight} colWidth={D_COL_W} colGap={D_COL_GAP} getMatchCenterY={dMatchCY} flip />
            </>
          )}

          {/* Convergence connectors: last round on each half → Final card */}
          {numHalfRounds > 0 && (() => {
            const lastIdx    = numHalfRounds - 1;
            const leftMatch  = leftRounds[lastIdx]?.matches[0];
            const rightMatch = rightRounds[lastIdx]?.matches[0];
            if (!leftMatch || !rightMatch) return null;
            const leftFromX   = dColXLeft(lastIdx) + D_COL_W;
            const rightFromX  = dColXRight(lastIdx);
            const fromY       = dMatchCY(lastIdx, 0);
            const finalLeftX  = finalCardLeft;
            const finalRightX = finalCardLeft + D_FINAL_W;
            const midL = leftFromX  + (finalLeftX  - leftFromX)  / 2;
            const midR = rightFromX + (finalRightX - rightFromX) / 2;
            const leftDone  = leftMatch.status === 'finished';
            const rightDone = rightMatch.status === 'finished';
            return (
              <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
                {/* Base convergence lines */}
                <path d={`M ${leftFromX} ${fromY} H ${midL} V ${finalCenterY} H ${finalLeftX}`}  stroke="#1e293b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                <path d={`M ${rightFromX} ${fromY} H ${midR} V ${finalCenterY} H ${finalRightX}`} stroke="#1e293b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                {/* Winner-path highlights */}
                {leftDone  && <path d={`M ${leftFromX} ${fromY} H ${midL} V ${finalCenterY} H ${finalLeftX}`}  stroke="#10b981" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.65} />}
                {rightDone && <path d={`M ${rightFromX} ${fromY} H ${midR} V ${finalCenterY} H ${finalRightX}`} stroke="#10b981" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.65} />}
                <circle cx={finalLeftX}  cy={finalCenterY} r={2.5} fill={leftDone  ? '#10b981' : '#1e293b'} opacity={leftDone  ? 0.65 : 1} />
                <circle cx={finalRightX} cy={finalCenterY} r={2.5} fill={rightDone ? '#10b981' : '#1e293b'} opacity={rightDone ? 0.65 : 1} />
              </svg>
            );
          })()}

          {/* Bracket cards — left half */}
          {leftRounds.map((r, rIdx) => r.matches.map((match, sIdx) => (
            <div key={match.id} className="absolute" style={{ left: dColXLeft(rIdx), top: dMatchTop(rIdx, sIdx) }}>
              <DesktopMatchCard match={match} roundId={r.round.id} active={r.round.id === activeRoundId} dragging={dragging} onSelect={onSelectRound} onHover={setHoveredMatch} />
            </div>
          )))}

          {/* Bracket cards — right half */}
          {rightRounds.map((r, rIdx) => r.matches.map((match, sIdx) => (
            <div key={match.id} className="absolute" style={{ left: dColXRight(rIdx), top: dMatchTop(rIdx, sIdx) }}>
              <DesktopMatchCard match={match} roundId={r.round.id} active={r.round.id === activeRoundId} dragging={dragging} onSelect={onSelectRound} onHover={setHoveredMatch} />
            </div>
          )))}

          {/* Final card — wider, amber-accented, centered on screen */}
          <div className="absolute" style={{ left: finalCardLeft, top: finalTop }}>
            <DesktopFinalCard match={finalMatch} roundId={finalRound.round.id} active={finalRound.round.id === activeRoundId} dragging={dragging} onSelect={onSelectRound} onHover={setHoveredMatch} />
          </div>

          {/* Third place — label outside above the card, same x as Final */}
          {hasTP && thirdPlace!.matches[0] && (
            <>
              <div
                className="absolute flex items-center justify-center gap-1 pointer-events-none"
                style={{ left: finalCardLeft, width: D_FINAL_W, top: tpTop - 15 }}
              >
                <Award className="h-2.5 w-2.5 shrink-0 text-orange-700/70" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-orange-700/70">
                  Tercer puesto
                </span>
              </div>
              <div className="absolute" style={{ left: finalCardLeft, top: tpTop }}>
                <DesktopMatchCard match={thirdPlace!.matches[0]} roundId={thirdPlace!.round.id} active={thirdPlace!.round.id === activeRoundId} dragging={dragging} onSelect={onSelectRound} onHover={setHoveredMatch} isThirdPlace cardW={D_FINAL_W} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info bar: shows hovered match details beneath the bracket */}
      <div className="h-7 flex items-center gap-4 px-3 border-t border-slate-800/40">
        {hoveredMatch ? (
          <>
            {infoDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5 text-slate-700" />
                <span className="text-[9px] text-slate-500">{infoDate}</span>
                {infoTime && <span className="text-[9px] text-slate-600">· {infoTime}</span>}
              </div>
            )}
            {hoveredMatch.venue && (
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-700" />
                <span className="text-[9px] text-slate-500 truncate">{hoveredMatch.venue}</span>
              </div>
            )}
            <span className={cn(
              'text-[9px] font-semibold shrink-0',
              hoveredMatch.status === 'in_progress' ? 'text-red-500' :
              hoveredMatch.status === 'finished'    ? 'text-slate-600' : 'text-slate-500',
            )}>
              {TREE_STATUS_LABELS[hoveredMatch.status]}
            </span>
          </>
        ) : (
          <span className="text-[9px] text-slate-800 italic select-none">
            Pasa el cursor sobre un partido para ver los detalles
          </span>
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
                isFinal={r.round.type === 'final'}
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
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [modalZoom, setModalZoom]         = useState(1);
  const [bracketZoom, setBracketZoom]     = useState(1);

  const zoomIn    = () => setModalZoom(z => Math.min(2,   Math.round((z + 0.1) * 10) / 10));
  const zoomOut   = () => setModalZoom(z => Math.max(0.4, Math.round((z - 0.1) * 10) / 10));
  const zoomReset = () => setModalZoom(1);

  const bracketZoomIn  = () => setBracketZoom(z => Math.min(2,   Math.round((z + 0.1) * 10) / 10));
  const bracketZoomOut = () => setBracketZoom(z => Math.max(0.4, Math.round((z - 0.1) * 10) / 10));

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsModalOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isModalOpen]);

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

      {/* Desktop: full bracket */}
      {bracketRounds.length > 0 && (
        <div className="hidden md:block rounded-xl border border-slate-800/50 overflow-hidden relative">
          <div className="overflow-auto p-4">
            <div style={{ zoom: bracketZoom } as React.CSSProperties}>
              <DesktopBracket
                bracketRounds={bracketRounds}
                thirdPlace={thirdPlace}
                activeRoundId={activeRoundId}
                onSelectRound={setActiveRoundId}
              />
            </div>
          </div>
          {/* Floating controls overlay */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 bg-slate-900/90 backdrop-blur-sm border border-slate-700/40 rounded-xl px-1 py-1 shadow-xl">
            <button
              onClick={bracketZoomOut}
              disabled={bracketZoom <= 0.4}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default transition-colors"
              aria-label="Alejar"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-slate-500 w-9 text-center tabular-nums font-mono select-none">
              {Math.round(bracketZoom * 100)}%
            </span>
            <button
              onClick={bracketZoomIn}
              disabled={bracketZoom >= 2}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default transition-colors"
              aria-label="Acercar"
            >
              <Plus className="h-3 w-3" />
            </button>
            <div className="w-px h-4 bg-slate-700/60 mx-0.5" />
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Pantalla completa"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop: full-screen modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 h-12 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-emerald-500/60" />
              <span className="text-sm font-semibold text-slate-300">Eliminatoria</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                disabled={modalZoom <= 0.4}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-[11px] text-slate-400 w-12 text-center tabular-nums font-mono select-none">
                {Math.round(modalZoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={modalZoom >= 2}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={zoomReset}
                className="h-7 px-2.5 text-[10px] font-mono text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700 rounded-lg transition-colors"
              >
                1:1
              </button>
              <div className="w-px h-5 bg-slate-800 mx-1" />
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {/* Bracket canvas — scrollable in both axes */}
          <div className="flex-1 overflow-auto p-4">
            <div style={{ zoom: modalZoom } as React.CSSProperties}>
              <DesktopBracket
                bracketRounds={bracketRounds}
                thirdPlace={thirdPlace}
                activeRoundId={activeRoundId}
                onSelectRound={setActiveRoundId}
              />
            </div>
          </div>
          {/* Champion inside modal */}
          {champion?.name && (
            <div className="border-t border-slate-800/40 shrink-0">
              <ChampionPanel name={champion.name} flag={champion.flag} />
            </div>
          )}
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
              {/* Swipe hint — top, shown while hint is still active */}
              <AnimatePresence>
                {!swipeHintDone && allBracketRounds.length > 1 && (
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

              <div className="relative">
                <MobileBracket
                  bracketRounds={allBracketRounds}
                  activeColIdx={activeBracketColIdx}
                  onChangeColIdx={handleMobileColChange}
                  thirdPlaceColIdx={thirdPlaceColIdx}
                />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/40 text-slate-400 hover:text-white shadow-lg transition-colors"
                  aria-label="Pantalla completa"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

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

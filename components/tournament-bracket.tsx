'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { RoundWithMatches, Match } from '@/types';
import { CalendarDays, Trophy, GitBranch, CheckCircle2, ChevronRight } from 'lucide-react';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';

// ── Metadata ───────────────────────────────────────────────────────────────────

const KNOCKOUT_ORDER  = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'];
const BRACKET_ORDER   = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];

const ROUND_META: Record<string, { label: string; abbr: string }> = {
  round_of_32: { label: '32avos de Final',  abbr: '32avos'   },
  round_of_16: { label: '16avos de Final',  abbr: '16avos'   },
  quarter:     { label: 'Cuartos de Final', abbr: 'Cuartos'  },
  semi:        { label: 'Semifinales',      abbr: 'Semis'    },
  third_place: { label: 'Tercer Lugar',     abbr: '3er Lugar'},
  final:       { label: 'Gran Final',       abbr: 'Final'    },
};

// ── Bracket geometry ───────────────────────────────────────────────────────────
//
// Standard binary-tree layout where each successive round occupies double the
// vertical "slot height" of the previous one, keeping match centers aligned.
//
// Validated bracket for WC 2026 (32-team, standard binary tree):
//   R32 slots  1-4  → R16 #1 → QF #1 → SF #1 → Final
//   R32 slots  5-8  → R16 #2 → QF #1 → SF #1 → Final
//   R32 slots  9-12 → R16 #3 → QF #2 → SF #1 → Final
//   R32 slots 13-16 → R16 #4 → QF #2 → SF #1 → Final
//   (mirror for SF #2 / bottom half)

const SLOT_H  = 56;   // px — base slot height (for the first/deepest round)
const CARD_H  = 44;   // px — match card height
const COL_W   = 172;  // px — card width
const COL_GAP = 44;   // px — horizontal gap between columns (connector area)
const PAD_X   = 16;   // px
const PAD_Y   = 22;   // px — top space (also hosts floating round labels)

function matchTop(roundIdx: number, slotIdx: number): number {
  const pow2 = 1 << roundIdx;
  return PAD_Y + slotIdx * pow2 * SLOT_H + ((pow2 - 1) * SLOT_H) / 2 + (SLOT_H - CARD_H) / 2;
}
function matchCenterY(roundIdx: number, slotIdx: number): number {
  return matchTop(roundIdx, slotIdx) + CARD_H / 2;
}

// ── Compact card — bracket tree ────────────────────────────────────────────────

function TreeCard({ match, active }: { match: Match; active: boolean }) {
  const fin     = match.status === 'finished';
  const live    = match.status === 'in_progress';
  const homeWon = fin && match.result?.winner === 'home';
  const awayWon = fin && match.result?.winner === 'away';
  const halfH   = (CARD_H - 1) / 2;

  const teamRow = (
    side: 'home' | 'away',
    won: boolean,
    lost: boolean,
  ) => {
    const team   = side === 'home' ? match.home_team : match.away_team;
    const phText = side === 'home' ? match.home_placeholder : match.away_placeholder;
    const name   = team?.short_name ?? team?.name ?? phText;
    const flag   = team?.flag_url;
    const score  = side === 'home' ? match.result?.home_score : match.result?.away_score;

    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 border-l-[3px] transition-colors',
          won  ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent',
          lost ? 'opacity-25' : '',
        )}
        style={{ height: halfH }}
      >
        {flag
          ? <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
          : <FlagPlaceholder size="sm" />
        }
        <span className={cn(
          'flex-1 text-[11px] font-semibold truncate leading-none',
          !name ? 'text-slate-600 italic' :
          won   ? 'text-white' :
          fin   ? 'text-slate-400' : 'text-slate-200',
        )}>
          {name ?? '···'}
        </span>
        {(fin || live) && (
          <span className={cn(
            'text-sm font-black tabular-nums font-mono shrink-0 w-4 text-right',
            won ? 'text-white' : 'text-slate-500',
          )}>
            {score ?? '–'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'rounded-md border overflow-hidden bg-slate-950 transition-all duration-150',
        active ? 'border-emerald-500/60 shadow-sm shadow-emerald-500/20' : 'border-slate-800',
        live   ? 'border-red-500/40' : '',
      )}
      style={{ width: COL_W, height: CARD_H }}
    >
      {teamRow('home', homeWon, awayWon)}
      <div className="h-px bg-slate-800" />
      {teamRow('away', awayWon, homeWon)}
    </div>
  );
}

// ── Detail card — mobile / selected round ──────────────────────────────────────

function DetailCard({ match, isFinal = false }: { match: Match; isFinal?: boolean }) {
  const fin     = match.status === 'finished';
  const live    = match.status === 'in_progress';
  const homeWon = fin && match.result?.winner === 'home';
  const awayWon = fin && match.result?.winner === 'away';

  const teamRow = (side: 'home' | 'away', won: boolean, lost: boolean) => {
    const team   = side === 'home' ? match.home_team : match.away_team;
    const phText = side === 'home' ? match.home_placeholder : match.away_placeholder;
    const name   = team?.name ?? phText;
    const flag   = team?.flag_url;
    const score  = side === 'home' ? match.result?.home_score : match.result?.away_score;

    return (
      <div className={cn(
        'flex items-center gap-3 px-4 py-3.5',
        won  ? 'bg-emerald-500/8' : '',
        lost ? 'opacity-35' : '',
      )}>
        <div className="w-7 shrink-0 flex justify-center">
          {flag
            ? <img src={flag} alt="" className="w-7 h-5 object-cover rounded-sm" />
            : <FlagPlaceholder size="md" />
          }
        </div>
        <span className={cn(
          'flex-1 text-sm font-semibold truncate',
          !name ? 'text-slate-600 italic text-xs' :
          won   ? 'text-white' :
          fin   ? 'text-slate-400' : 'text-slate-200',
        )}>
          {name ?? 'Por definir'}
        </span>
        {(fin || live) && (
          <span className={cn(
            'text-2xl font-black tabular-nums font-mono shrink-0',
            won ? 'text-white' : 'text-slate-500',
          )}>
            {score ?? '–'}
          </span>
        )}
        <div className={cn('w-0.5 h-5 rounded-full shrink-0', won ? 'bg-emerald-500' : 'bg-transparent')} />
      </div>
    );
  };

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden bg-slate-950',
      isFinal ? 'border-amber-500/40 shadow-lg shadow-amber-500/10' : 'border-slate-800',
    )}>
      {teamRow('home', homeWon, awayWon)}
      <div className="h-px bg-slate-800 mx-4" />
      {teamRow('away', awayWon, homeWon)}
      <div className={cn(
        'px-4 py-2 border-t border-slate-800/60 flex items-center justify-between',
        isFinal ? 'bg-amber-950/20' : '',
      )}>
        <span className="text-[10px] text-slate-600 flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" />
          {new Date(match.scheduled_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          {' · '}
          {new Date(match.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {live && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
            En vivo
          </span>
        )}
        {fin  && <span className="text-[10px] text-slate-600">Finalizado</span>}
        {match.status === 'scheduled' && <span className="text-[10px] text-slate-600">Programado</span>}
      </div>
    </div>
  );
}

// ── SVG bracket tree ───────────────────────────────────────────────────────────

function BracketTree({
  bracketRounds,
  activeRoundId,
  onSelectRound,
}: {
  bracketRounds: RoundWithMatches[];
  activeRoundId: number | null;
  onSelectRound: (id: number) => void;
}) {
  const firstCount = bracketRounds[0]?.matches.length ?? 0;
  if (!firstCount) return null;

  const totalH = firstCount * SLOT_H + 2 * PAD_Y;
  const totalW = bracketRounds.length * COL_W + (bracketRounds.length - 1) * COL_GAP + 2 * PAD_X;
  const colX   = (rIdx: number) => PAD_X + rIdx * (COL_W + COL_GAP);

  return (
    <div className="overflow-x-auto overflow-y-auto scrollbar-none" style={{ maxHeight: 820 }}>
      <div className="relative" style={{ width: totalW, height: totalH }}>

        {/* Round labels */}
        {bracketRounds.map((r, rIdx) => (
          <div
            key={`lbl-${r.round.id}`}
            className="absolute text-[9px] font-bold uppercase tracking-widest text-slate-600 text-center"
            style={{ left: colX(rIdx), width: COL_W, top: 4 }}
          >
            {ROUND_META[r.round.type]?.abbr ?? r.round.name}
          </div>
        ))}

        {/* SVG connector lines */}
        <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
          {bracketRounds.slice(0, -1).map((_, rIdx) => {
            const nextCount = bracketRounds[rIdx + 1]?.matches.length ?? 0;
            const fromX = colX(rIdx) + COL_W;
            const midX  = fromX + COL_GAP / 2;
            const toX   = colX(rIdx + 1);
            return Array.from({ length: nextCount }, (_, ps) => {
              const topY = matchCenterY(rIdx, ps * 2);
              const botY = matchCenterY(rIdx, ps * 2 + 1);
              const midY = (topY + botY) / 2;
              return (
                <path
                  key={`c-${rIdx}-${ps}`}
                  // Top arm → vertical → bottom arm → outgoing arm to next round
                  d={`M ${fromX} ${topY} H ${midX} V ${botY} M ${fromX} ${botY} H ${midX} M ${midX} ${midY} H ${toX}`}
                  stroke="#1e293b"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              );
            });
          })}
        </svg>

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
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function TournamentBracket({ rounds }: { rounds: RoundWithMatches[] }) {

  const knockoutRounds = useMemo(() =>
    rounds
      .filter(r => KNOCKOUT_ORDER.includes(r.round.type) && r.matches.length > 0)
      .sort((a, b) => KNOCKOUT_ORDER.indexOf(a.round.type) - KNOCKOUT_ORDER.indexOf(b.round.type)),
    [rounds],
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

  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);

  useEffect(() => {
    if (!knockoutRounds.length) return;
    const inProg  = knockoutRounds.find(r => r.matches.some(m => m.status === 'in_progress'));
    const upcoming = knockoutRounds.find(r => r.matches.some(m => m.status === 'scheduled'));
    setActiveRoundId((inProg ?? upcoming ?? knockoutRounds[knockoutRounds.length - 1]).round.id);
  }, [knockoutRounds]);

  const activeRound  = knockoutRounds.find(r => r.round.id === activeRoundId);
  const isFinalRound = activeRound?.round.type === 'final';
  const champion     = isFinalRound && activeRound?.matches[0]?.result
    ? activeRound.matches[0].result.winner === 'home'
      ? (activeRound.matches[0].home_team?.name ?? activeRound.matches[0].home_placeholder)
      : (activeRound.matches[0].away_team?.name ?? activeRound.matches[0].away_placeholder)
    : null;

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

      {/* ── Round stepper ──────────────────────────────────────────── */}
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
        {knockoutRounds.map((r, idx) => {
          const meta    = ROUND_META[r.round.type];
          const isActive = activeRoundId === r.round.id;
          const allDone  = r.matches.every(m => m.status === 'finished');
          const isFinal  = r.round.type === 'final';
          return (
            <div key={r.round.id} className="flex items-center shrink-0">
              <button
                onClick={() => setActiveRoundId(r.round.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all',
                  isActive && isFinal  ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'  :
                  isActive             ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' :
                  allDone              ? 'border-slate-700/40 text-slate-500' :
                                         'border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
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

      {/* ── Desktop bracket tree ────────────────────────────────────── */}
      {bracketRounds.length > 0 && (
        <div className="hidden md:block rounded-xl border border-slate-800 bg-[#070d14] p-4">
          <BracketTree
            bracketRounds={bracketRounds}
            activeRoundId={activeRoundId}
            onSelectRound={setActiveRoundId}
          />
          {thirdPlace && thirdPlace.matches.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center gap-4">
              <div className="shrink-0">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  3er Lugar · {new Date(thirdPlace.matches[0].scheduled_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </p>
                <button
                  onClick={() => setActiveRoundId(thirdPlace.round.id)}
                  className="focus:outline-none"
                >
                  <TreeCard
                    match={thirdPlace.matches[0]}
                    active={activeRoundId === thirdPlace.round.id}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Round detail — mobile primary, desktop supplemental ─────── */}
      <AnimatePresence mode="wait">
        {activeRound && (
          <motion.div
            key={activeRoundId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            {/* Round header */}
            <div className={cn(
              'rounded-xl p-4 border flex items-center gap-3',
              isFinalRound
                ? 'bg-gradient-to-r from-amber-950/70 via-amber-900/30 to-slate-950 border-amber-500/30'
                : 'bg-slate-900/70 border-slate-800',
            )}>
              <div className={cn(
                'rounded-xl p-2.5 border shrink-0',
                isFinalRound ? 'bg-amber-500/15 border-amber-500/25' : 'bg-emerald-500/10 border-emerald-500/20',
              )}>
                {isFinalRound
                  ? <Trophy className="h-5 w-5 text-amber-400" />
                  : <GitBranch className="h-4 w-4 text-emerald-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn('font-bold text-base leading-tight', isFinalRound ? 'text-amber-300' : 'text-white')}>
                  {ROUND_META[activeRound.round.type]?.label ?? activeRound.round.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeRound.matches.length} {activeRound.matches.length === 1 ? 'partido' : 'partidos'}
                  {' · '}
                  {activeRound.matches.filter(m => m.status === 'finished').length} finalizados
                </p>
              </div>
              {champion && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-amber-500/70 uppercase tracking-wide font-bold">Campeón</p>
                  <p className="text-sm font-bold text-amber-300 truncate max-w-28">{champion}</p>
                </div>
              )}
            </div>

            {/* Match cards grid */}
            <div className={cn('grid gap-3', isFinalRound ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
              {[...activeRound.matches]
                .sort((a, b) => (a.bracket_slot ?? 99) - (b.bracket_slot ?? 99))
                .map(m => <DetailCard key={m.id} match={m} isFinal={isFinalRound} />)
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

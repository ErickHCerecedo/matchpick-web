'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, Activity } from 'lucide-react';

// ── types ──────────────────────────────────────────────────────────────────

interface DbScore { home: number; away: number; confirmed: boolean }
interface ApiScore { home: number; away: number }

interface MatchRow {
  id: number;
  external_id: string;
  scheduled_at: string;
  db_status: string;
  home_team: string;
  away_team: string;
  db_score: DbScore | null;
  api_found: boolean;
  api_status: string | null;
  api_mapped: string | null;
  api_score: ApiScore | null;
}

interface StatusData {
  ok: boolean;
  connected: boolean;
  competition?: string;
  rate_limit?: { available_minute?: string; allowed_minute?: string };
  total_api?: number;
  matches: MatchRow[];
}

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  scheduled:   'Programado',
  in_progress: 'En juego',
  finished:    'Finalizado',
  cancelled:   'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled:   'text-slate-400',
  in_progress: 'text-emerald-400',
  finished:    'text-blue-400',
  cancelled:   'text-red-400',
};


// ── component ──────────────────────────────────────────────────────────────

export function ApiMonitorModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: StatusData; message: string }>(
        '/admin/football-data/match-status'
      );
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con la API');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (val && !data) load();
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-violet-700/50 text-violet-400 hover:text-violet-300 hover:border-violet-500 text-xs h-8 gap-1.5"
        onClick={() => handleOpen(true)}
      >
        <Activity className="h-3.5 w-3.5" />
        Monitor API
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-400" />
            Monitor conexión API — football-data.org
          </DialogTitle>
        </DialogHeader>

        {/* toolbar */}
        <div className="shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {data?.connected && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>{data.competition ?? 'Conectado'}</span>
                {data.rate_limit?.available_minute != null && (
                  <span className="text-slate-500">
                    · {data.rate_limit.available_minute} llamadas/min restantes
                  </span>
                )}
              </>
            )}
            {data && !data.connected && !error && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>Sin partidos con external_id</span>
              </>
            )}
            {error && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="text-red-400">{error}</span>
              </>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={load}
            disabled={loading}
            className="h-7 text-xs text-slate-400 hover:text-white gap-1.5"
          >
            {loading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Actualizar
          </Button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
          {loading && !data && (
            <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando API…
            </div>
          )}

          {!loading && !error && data?.matches.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-8">
              No hay partidos con external_id asignado.
              <br />Asígnalos desde la pestaña <span className="text-white">Calendario → editar partido</span>.
            </p>
          )}

          {data?.matches.map((m) => {
            const statusMismatch = m.api_mapped && m.db_status !== m.api_mapped;
            const scoreMismatch =
              m.db_score && m.api_score &&
              (m.db_score.home !== m.api_score.home || m.db_score.away !== m.api_score.away);

            return (
              <div
                key={m.id}
                className={cn(
                  'rounded-xl border p-3 space-y-2',
                  statusMismatch || scoreMismatch
                    ? 'border-amber-700/50 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/60',
                )}
              >
                {/* header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {m.home_team} <span className="text-slate-500">vs</span> {m.away_team}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {m.scheduled_at
                        ? new Date(m.scheduled_at).toLocaleString('es-MX', {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '–'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-violet-400 bg-violet-900/30 border border-violet-800/40 rounded px-1.5 py-0.5">
                    ext #{m.external_id}
                  </span>
                </div>

                {/* status row */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Estado DB</p>
                    <p className={cn('font-medium', STATUS_COLOR[m.db_status] ?? 'text-slate-300')}>
                      {STATUS_LABEL[m.db_status] ?? m.db_status}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Estado API</p>
                    {m.api_found ? (
                      <p className={cn(
                        'font-medium',
                        statusMismatch ? 'text-amber-400' : STATUS_COLOR[m.api_mapped ?? ''] ?? 'text-slate-300',
                      )}>
                        {m.api_status ?? '–'}
                        {m.api_mapped && m.api_mapped !== m.db_status && (
                          <span className="ml-1 text-amber-400">⚠</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-red-400">No encontrado</p>
                    )}
                  </div>
                </div>

                {/* score row */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Marcador DB</p>
                    <p className="text-slate-300 tabular-nums">
                      {m.db_score
                        ? <>
                            {m.db_score.home} – {m.db_score.away}
                            {' '}
                            <span className={cn('text-[9px]', m.db_score.confirmed ? 'text-blue-400' : 'text-amber-400')}>
                              {m.db_score.confirmed ? 'confirmado' : 'provisional'}
                            </span>
                          </>
                        : <span className="text-slate-600">sin resultado</span>
                      }
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Marcador API</p>
                    {m.api_score ? (
                      <p className={cn(
                        'tabular-nums',
                        scoreMismatch ? 'text-amber-400 font-semibold' : 'text-slate-300',
                      )}>
                        {m.api_score.home} – {m.api_score.away}
                        {scoreMismatch && <span className="ml-1">⚠</span>}
                      </p>
                    ) : (
                      <p className="text-slate-600">–</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}

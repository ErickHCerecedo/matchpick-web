'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader2, Play, Trash2, Terminal } from 'lucide-react';

// ── types ──────────────────────────────────────────────────────────────────

type Level = 'info' | 'detail' | 'success' | 'warn' | 'error';

interface LogLine {
  text: string;
  level: Level;
}

interface RunResult {
  ok: boolean;
  exit_code: number;
  lines: LogLine[];
  ran_at: string;
  duration: number;
}

interface Session {
  command: string;
  result: RunResult;
}

// ── helpers ────────────────────────────────────────────────────────────────

const LINE_COLOR: Record<Level, string> = {
  info:    'text-green-300',
  detail:  'text-slate-400',
  success: 'text-emerald-400',
  warn:    'text-yellow-400',
  error:   'text-red-400',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── component ──────────────────────────────────────────────────────────────

export function ApiMonitorModal() {
  const [open, setOpen]         = useState(false);
  const [running, setRunning]   = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const scrollBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  const runSync = async () => {
    setRunning(true);
    const cmd = 'php artisan matches:wc-auto-sync';
    try {
      const res = await api.post<{ data: RunResult }>('/admin/football-data/run-sync', {});
      setSessions((prev) => [...prev, { command: cmd, result: res.data }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red';
      setSessions((prev) => [
        ...prev,
        {
          command: cmd,
          result: {
            ok: false,
            exit_code: 1,
            lines: [{ text: msg, level: 'error' }],
            ran_at: new Date().toISOString(),
            duration: 0,
          },
        },
      ]);
    } finally {
      setRunning(false);
      scrollBottom();
    }
  };

  const clear = () => setSessions([]);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-violet-700/50 text-violet-400 hover:text-violet-300 hover:border-violet-500 text-xs h-8 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Terminal className="h-3.5 w-3.5" />
        Monitor API
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl border-slate-800 text-white flex flex-col p-0 overflow-hidden"
          style={{ background: '#0a0a0a', maxHeight: '85vh' }}
        >
          {/* title bar */}
          <DialogHeader className="shrink-0 px-4 pt-4 pb-2 border-b border-slate-800/80">
            <DialogTitle className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-violet-400" />
              matches:wc-auto-sync — monitor
            </DialogTitle>
          </DialogHeader>

          {/* terminal body */}
          <div className="flex-1 overflow-y-auto font-mono text-xs px-4 py-3 space-y-4 min-h-0">
            {sessions.length === 0 && !running && (
              <p className="text-slate-600">
                Presiona <span className="text-violet-400">Ejecutar</span> para correr el cron job manualmente y ver el output.
              </p>
            )}

            {sessions.map((s, i) => (
              <div key={i} className="space-y-0.5">
                {/* prompt line */}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="text-violet-500">$</span>
                  <span className="text-slate-300">{s.command}</span>
                </div>

                {/* output lines */}
                {s.result.lines.map((l, j) => (
                  <div key={j} className={cn('pl-3 leading-relaxed whitespace-pre-wrap break-all', LINE_COLOR[l.level])}>
                    {l.text}
                  </div>
                ))}

                {/* exit status */}
                <div className={cn('mt-1 pl-3 text-[10px]', s.result.ok ? 'text-emerald-500' : 'text-red-500')}>
                  {s.result.ok ? '✓ exitoso' : '✗ falló'} · exit {s.result.exit_code} · {s.result.duration}ms · {formatTime(s.result.ran_at)}
                </div>
              </div>
            ))}

            {/* running indicator */}
            {running && (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="text-violet-500">$</span>
                  <span className="text-slate-300">php artisan matches:wc-auto-sync</span>
                </div>
                <div className="pl-3 text-slate-500 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  ejecutando…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* toolbar */}
          <div className="shrink-0 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between gap-2" style={{ background: '#111' }}>
            <span className="text-[10px] text-slate-600 font-mono">
              {sessions.length > 0
                ? `${sessions.length} ejecución${sessions.length !== 1 ? 'es' : ''}`
                : 'sin ejecuciones'}
            </span>
            <div className="flex items-center gap-2">
              {sessions.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clear}
                  className="h-7 text-xs text-slate-500 hover:text-white gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpiar
                </Button>
              )}
              <Button
                size="sm"
                onClick={runSync}
                disabled={running}
                className="h-7 text-xs bg-violet-700 hover:bg-violet-600 text-white gap-1.5 disabled:opacity-50"
              >
                {running
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Play className="h-3 w-3" />}
                Ejecutar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

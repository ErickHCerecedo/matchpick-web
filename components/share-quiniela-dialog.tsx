'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Quiniela, Standing } from '@/types';
import {
  Download,
  Share2,
  Copy,
  Check,
  Loader2,
  MessageCircle,
} from 'lucide-react';

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

const APP_DOMAIN = 'matchpick-web-production.up.railway.app';
const APP_URL = `https://${APP_DOMAIN}`;

// ── rank colors ────────────────────────────────────────────────────────────

function getRankStyle(rank: number) {
  if (rank === 1) return {
    accent: '#F59E0B', glow: 'rgba(245,158,11,0.18)',
    bg: 'linear-gradient(145deg, #1a1100 0%, #0d0d0d 45%, #180f00 100%)',
    badge: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', label: '🥇',
  };
  if (rank === 2) return {
    accent: '#94A3B8', glow: 'rgba(148,163,184,0.15)',
    bg: 'linear-gradient(145deg, #111827 0%, #0d0d0d 45%, #1a1f2e 100%)',
    badge: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)', label: '🥈',
  };
  if (rank === 3) return {
    accent: '#F97316', glow: 'rgba(249,115,22,0.15)',
    bg: 'linear-gradient(145deg, #1a0d00 0%, #0d0d0d 45%, #1a0d00 100%)',
    badge: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', label: '🥉',
  };
  return {
    accent: '#10B981', glow: 'rgba(16,185,129,0.13)',
    bg: 'linear-gradient(145deg, #071a0e 0%, #0a0f0d 45%, #071a0e 100%)',
    badge: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', label: `#${rank}`,
  };
}

function ordinalLabel(rank: number) {
  if (rank === 1) return '1er lugar';
  if (rank === 2) return '2do lugar';
  if (rank === 3) return '3er lugar';
  return `${rank}° lugar`;
}

// ── Share card ─────────────────────────────────────────────────────────────

function ShareCard({
  cardRef,
  quiniela,
  standing,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  quiniela: Quiniela;
  standing: Standing;
}) {
  const s = getRankStyle(standing.rank);
  const initial = standing.user.name.charAt(0).toUpperCase();
  const accuracy = standing.predictions_made > 0
    ? Math.round(((standing.exact_scores + standing.correct_results) / standing.predictions_made) * 100)
    : null;

  const stats = [
    {
      emoji: '🎯',
      label1: 'Marcador', label2: 'Exacto',
      value: String(standing.exact_scores),
      sub: `+${standing.exact_scores * 3} pts`,
      accent: '#34d399',
      bg: 'rgba(52,211,153,0.08)',
      border: 'rgba(52,211,153,0.22)',
    },
    {
      emoji: '✓',
      label1: 'Resultado', label2: 'Correcto',
      value: String(standing.correct_results),
      sub: `+${standing.correct_results} pts`,
      accent: '#60a5fa',
      bg: 'rgba(96,165,250,0.08)',
      border: 'rgba(96,165,250,0.22)',
    },
    {
      emoji: '⚡',
      label1: 'Precisión', label2: '',
      value: accuracy !== null ? `${accuracy}%` : '—',
      sub: 'precisión',
      accent: 'rgba(255,255,255,0.65)',
      bg: 'rgba(255,255,255,0.05)',
      border: 'rgba(255,255,255,0.10)',
    },
  ];

  return (
    <div
      ref={cardRef}
      style={{
        width: '400px', height: '711px',
        background: s.bg,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: '0', flexShrink: 0,
      }}
    >
      {/* Glows */}
      <div style={{ position: 'absolute', top: '-100px', right: '-80px', width: '340px', height: '340px', borderRadius: '50%', background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-120px', left: '-100px', width: '380px', height: '380px', borderRadius: '50%', background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      {/* ── Header ── */}
      <div style={{ padding: '28px 28px 0', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>
          Match<span style={{ color: s.accent }}>Pick</span>
        </span>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
        {/* Rank badge */}
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: s.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: `0 0 40px ${s.glow}, 0 8px 32px rgba(0,0,0,0.4)` }}>
          <span style={{ fontSize: '46px', lineHeight: 1 }}>{s.label}</span>
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: '5px', letterSpacing: '0.5px' }}>Estoy en el</p>

        <p style={{ fontSize: '50px', fontWeight: '900', color: '#ffffff', lineHeight: '1', letterSpacing: '-2px', marginBottom: '5px' }}>
          {ordinalLabel(standing.rank)}
        </p>

        <p style={{ fontSize: '13px', color: s.accent, fontWeight: '600', marginBottom: '22px' }}>
          de {quiniela.participants_count} jugadores
        </p>

        {/* User chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', padding: '7px 16px 7px 7px', marginBottom: '22px' }}>
          {standing.user.avatar_url ? (
            <img src={standing.user.avatar_url} alt={standing.user.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: s.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              {initial}
            </div>
          )}
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{standing.user.name}</span>
        </div>

        {/* Total points */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <p style={{ fontSize: '68px', fontWeight: '900', color: '#ffffff', lineHeight: '1', letterSpacing: '-3px' }}>
            {standing.total_points}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>puntos totales</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          {stats.map(({ emoji, label1, label2, value, sub, accent, bg, border }) => (
            <div key={label1} style={{ flex: 1, textAlign: 'center', background: bg, border: `1px solid ${border}`, borderRadius: '14px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '15px', lineHeight: 1 }}>{emoji}</span>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.3', marginTop: '3px' }}>{label1}</p>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.3' }}>{label2}</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: accent, lineHeight: '1', marginTop: '5px' }}>{value}</p>
              <p style={{ fontSize: '9px', color: accent, opacity: 0.75, fontWeight: '600', marginTop: '2px' }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '16px 28px 22px', borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '500', marginBottom: '2px' }}>Quiniela</p>
          <p style={{ fontSize: '13px', color: '#ffffff', fontWeight: '700', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {quiniela.name}
          </p>
        </div>
        <div style={{ background: s.badge, borderRadius: '8px', padding: '6px 10px', fontSize: '9px', fontWeight: '700', color: '#fff', letterSpacing: '0.3px', boxShadow: `0 2px 12px ${s.glow}`, maxWidth: '140px', textAlign: 'center' }}>
          {APP_DOMAIN}
        </div>
      </div>
    </div>
  );
}

// ── Platform buttons ───────────────────────────────────────────────────────

const PLATFORMS = [
  {
    key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle,
    color: 'bg-green-700/20 border-green-700/40 text-green-400 hover:bg-green-700/30',
    buildUrl: (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    key: 'twitter', label: 'X / Twitter', icon: IconX,
    color: 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50',
    buildUrl: (text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
];

// ── Main dialog ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  quiniela: Quiniela;
  standing: Standing | null;
}

export function ShareQuinielaDialog({ open, onClose, quiniela, standing }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!standing) return null;

  const shareText = `¡Estoy en el ${ordinalLabel(standing.rank)} de ${quiniela.participants_count} jugadores en la quiniela "${quiniela.name}" del ${quiniela.tournament.name}! ⚽ Juega conmigo en ${APP_URL}`;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : APP_URL;

  const generateImage = async () => {
    if (!cardRef.current) throw new Error('No ref');
    return toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, skipFonts: true });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateImage();
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `matchpick-${quiniela.slug}.png`;
      link.click();
      toast.success('Imagen descargada — ¡lista para compartir!');
    } catch {
      toast.error('No se pudo generar la imagen. Prueba la captura manual.');
    } finally {
      setDownloading(false);
    }
  };

  const handleInstagramShare = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateImage();
      const blob = await fetch(dataUrl).then(r => r.blob());
      const file = new File([blob], 'matchpick-posicion.png', { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi posición en MatchPick' });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'matchpick-posicion.png';
        link.click();
        toast.success('Imagen descargada — ábrela desde Instagram Stories');
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setTimeout(() => {
          window.open(isMobile ? 'instagram://story-camera' : 'https://www.instagram.com/', '_blank');
        }, 1000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('No se pudo compartir. Descarga la imagen manualmente.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success('Texto copiado al portapapeles.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) { handleCopyText(); return; }
    try { await navigator.share({ text: shareText, url: pageUrl }); } catch { /* cancelled */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 sm:max-w-lg p-0">
        {/* Scrollable inner container */}
        <div className="overflow-y-auto max-h-[calc(100dvh-4rem)]">
          <div className="p-5 pb-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Share2 className="h-4 w-4 text-emerald-400" />
                Compartir mi posición
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Card preview */}
          <div className="overflow-x-auto px-5 py-4">
            <div className="flex justify-center">
              <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center', height: '511px' }}>
                <ShareCard cardRef={cardRef} quiniela={quiniela} standing={standing} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-6 space-y-3">
            {/* Download */}
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm font-semibold"
            >
              {downloading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generando imagen...</>
                : <><Download className="h-4 w-4 mr-2" />Descargar imagen</>
              }
            </Button>

            {/* Social platforms */}
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(({ key, label, icon: Icon, color, buildUrl }) => (
                <a
                  key={key}
                  href={buildUrl(shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all', color)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
              <button
                onClick={handleInstagramShare}
                disabled={downloading}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all bg-pink-900/20 border-pink-700/30 text-pink-400 hover:bg-pink-900/30 disabled:opacity-50"
              >
                <IconInstagram className="h-4 w-4" />
                Instagram
              </button>
            </div>

            {/* Copy / Native share */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyText}
                className="flex-1 border-slate-700 text-slate-300 hover:text-white"
              >
                {copied
                  ? <><Check className="h-4 w-4 mr-2 text-emerald-400" />Copiado</>
                  : <><Copy className="h-4 w-4 mr-2" />Copiar texto</>
                }
              </Button>
              {typeof window !== 'undefined' && 'share' in navigator && (
                <Button
                  variant="outline"
                  onClick={handleNativeShare}
                  className="flex-1 border-slate-700 text-slate-300 hover:text-white"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartir
                </Button>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-600">
              Instagram descarga la imagen y abre la cámara de Stories
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

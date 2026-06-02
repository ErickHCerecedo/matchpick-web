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

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ── rank colors ────────────────────────────────────────────────────────────

function getRankStyle(rank: number) {
  if (rank === 1) return {
    accent: '#F59E0B',
    glow: 'rgba(245,158,11,0.18)',
    bg: 'linear-gradient(145deg, #1a1100 0%, #0d0d0d 45%, #180f00 100%)',
    badge: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    label: '🥇',
  };
  if (rank === 2) return {
    accent: '#94A3B8',
    glow: 'rgba(148,163,184,0.15)',
    bg: 'linear-gradient(145deg, #111827 0%, #0d0d0d 45%, #1a1f2e 100%)',
    badge: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
    label: '🥈',
  };
  if (rank === 3) return {
    accent: '#F97316',
    glow: 'rgba(249,115,22,0.15)',
    bg: 'linear-gradient(145deg, #1a0d00 0%, #0d0d0d 45%, #1a0d00 100%)',
    badge: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    label: '🥉',
  };
  return {
    accent: '#10B981',
    glow: 'rgba(16,185,129,0.13)',
    bg: 'linear-gradient(145deg, #071a0e 0%, #0a0f0d 45%, #071a0e 100%)',
    badge: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    label: `#${rank}`,
  };
}

function ordinalLabel(rank: number) {
  if (rank === 1) return '1er lugar';
  if (rank === 2) return '2do lugar';
  if (rank === 3) return '3er lugar';
  return `${rank}° lugar`;
}

// ── Share card template (rendered off-screen for capture) ──────────────────

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

  return (
    <div
      ref={cardRef}
      style={{
        width: '400px',
        height: '711px',
        background: s.bg,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        flexShrink: 0,
      }}
    >
      {/* Ambient glow — top right */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-80px',
        width: '340px', height: '340px', borderRadius: '50%',
        background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {/* Ambient glow — bottom left */}
      <div style={{
        position: 'absolute', bottom: '-120px', left: '-100px',
        width: '380px', height: '380px', borderRadius: '50%',
        background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* ── Header ── */}
      <div style={{
        padding: '28px 28px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: s.badge,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', lineHeight: 1,
          }}>
            ⚽
          </div>
          <span style={{
            fontSize: '18px', fontWeight: '800', color: '#ffffff',
            letterSpacing: '-0.5px',
          }}>
            Match<span style={{ color: s.accent }}>Pick</span>
          </span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: '600', color: s.accent,
          background: `${s.glow}`,
          border: `1px solid ${s.accent}40`,
          padding: '4px 10px', borderRadius: '20px',
          letterSpacing: '0.5px',
        }}>
          {quiniela.tournament.name}
        </span>
      </div>

      {/* ── Main rank section ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 28px', position: 'relative', zIndex: 1,
        gap: '0',
      }}>
        {/* Rank badge */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%',
          background: s.badge,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: `0 0 40px ${s.glow}, 0 8px 32px rgba(0,0,0,0.4)`,
        }}>
          <span style={{ fontSize: '48px', lineHeight: 1 }}>{s.label}</span>
        </div>

        {/* "Estoy en el" label */}
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.5)',
          fontWeight: '500', marginBottom: '6px', letterSpacing: '0.5px',
        }}>
          Estoy en el
        </p>

        {/* Rank */}
        <p style={{
          fontSize: '52px', fontWeight: '900', color: '#ffffff',
          lineHeight: '1', letterSpacing: '-2px', marginBottom: '6px',
        }}>
          {ordinalLabel(standing.rank)}
        </p>

        {/* Of N players */}
        <p style={{
          fontSize: '14px', color: s.accent, fontWeight: '600',
          marginBottom: '28px',
        }}>
          de {quiniela.participants_count} jugadores
        </p>

        {/* User chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50px', padding: '8px 18px 8px 8px',
          marginBottom: '28px',
        }}>
          {standing.user.avatar_url ? (
            <img
              src={standing.user.avatar_url}
              alt={standing.user.name}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: s.badge,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '700', color: '#fff',
            }}>
              {initial}
            </div>
          )}
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>
            {standing.user.name}
          </span>
        </div>

        {/* Points */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{
            fontSize: '72px', fontWeight: '900', color: '#ffffff',
            lineHeight: '1', letterSpacing: '-3px',
          }}>
            {standing.total_points}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
            puntos totales
          </p>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '0',
        }}>
          {[
            { value: standing.exact_scores, label: 'exactos', icon: '🎯' },
            { value: standing.correct_results, label: 'correctos', icon: '✓' },
            { value: standing.predictions_made, label: 'pronósticos', icon: '📊' },
          ].map(({ value, label, icon }) => (
            <div key={label} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '10px 16px',
              minWidth: '88px',
            }}>
              <p style={{ fontSize: '11px', marginBottom: '4px' }}>{icon}</p>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '18px 28px 24px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.35)',
              fontWeight: '500', marginBottom: '3px',
            }}>
              Quiniela
            </p>
            <p style={{
              fontSize: '14px', color: '#ffffff', fontWeight: '700',
              maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {quiniela.name}
            </p>
          </div>
          <div style={{
            background: s.badge,
            borderRadius: '8px', padding: '8px 14px',
            fontSize: '11px', fontWeight: '700', color: '#fff',
            letterSpacing: '0.5px',
            boxShadow: `0 2px 12px ${s.glow}`,
          }}>
            matchpick.app
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Platform share buttons ─────────────────────────────────────────────────

const PLATFORMS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-green-700/20 border-green-700/40 text-green-400 hover:bg-green-700/30',
    buildUrl: (text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    icon: IconX,
    color: 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50',
    buildUrl: (text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: IconFacebook,
    color: 'bg-blue-900/20 border-blue-700/30 text-blue-400 hover:bg-blue-900/30',
    buildUrl: (_text: string, url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
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

  const shareText = `¡Estoy en el ${ordinalLabel(standing.rank)} de ${quiniela.participants_count} jugadores en la quiniela "${quiniela.name}" del ${quiniela.tournament.name}! ⚽ Juega conmigo en matchpick.app`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
      });
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

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyText();
      return;
    }
    try {
      await navigator.share({ text: shareText });
    } catch {
      // User cancelled
    }
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success('Texto copiado al portapapeles.');
    setTimeout(() => setCopied(false), 2500);
  };

  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://matchpick.app';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="bg-slate-950 border-slate-800 sm:max-w-lg p-0 overflow-hidden"
        showCloseButton
      >
        <div className="p-5 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Share2 className="h-4 w-4 text-emerald-400" />
              Compartir mi posición
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Card preview — horizontally scrollable on small screens */}
        <div className="overflow-x-auto px-5 py-4">
          <div className="flex justify-center">
            {/* Scale down the 400×711 card to fit the dialog */}
            <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center', height: '511px' }}>
              <ShareCard cardRef={cardRef} quiniela={quiniela} standing={standing} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-4">
          {/* Primary: download */}
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm font-semibold"
          >
            {downloading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generando imagen...</>
              : <><Download className="h-4 w-4 mr-2" />Descargar imagen (Stories / Feed)</>
            }
          </Button>

          {/* Platform buttons */}
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map(({ key, label, icon: Icon, color, buildUrl }) => (
              <a
                key={key}
                href={buildUrl(shareText, pageUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all',
                  color
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </div>

          {/* Secondary: copy text + native share */}
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
            Descarga la imagen y publícala directamente en Instagram Stories o Feed
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

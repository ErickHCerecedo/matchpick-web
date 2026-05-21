'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Invitation } from '@/types';
import { Users, Trophy, Loader2 } from 'lucide-react';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<Invitation>>(`/invitations/${token}`)
      .then((res) => setInvitation(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await api.post<ApiResponse<{ slug: string }>>(`/invitations/${token}/accept`, {});
      toast.success('¡Te uniste a la quiniela!');
      router.push(`/quinielas/${res.data.slug}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al unirse');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-700 max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-2xl mb-3">😕</p>
            <h3 className="text-white font-semibold mb-2">Invitación inválida</h3>
            <p className="text-slate-400 text-sm mb-6">
              {error ?? 'Esta invitación ha expirado o no existe.'}
            </p>
            <Link href="/" className={cn(buttonVariants(), 'bg-emerald-500 hover:bg-emerald-600 text-white')}>
              Ir al inicio
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quiniela } = invitation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            Match<span className="text-emerald-400">Pick</span>
          </h1>
        </div>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">🏆</div>
            <CardTitle className="text-white">Te invitaron a una quiniela</CardTitle>
            <CardDescription className="text-slate-400">
              Únete y haz tus predicciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-white text-lg">{quiniela.name}</h3>
              <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Trophy className="h-3.5 w-3.5" />
                <span>{quiniela.tournament.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Users className="h-3.5 w-3.5" />
                <span>{quiniela.participants_count} participantes</span>
              </div>
              <Badge
                variant="outline"
                className="border-slate-600 text-slate-400 text-xs"
              >
                Creada por {quiniela.creator.name}
              </Badge>
            </div>

            {user ? (
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Unirme a la quiniela
              </Button>
            ) : (
              <div className="space-y-2">
                <Link
                  href={`/login?redirect=/invitaciones/${token}`}
                  className={cn(buttonVariants(), 'w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold justify-center')}
                >
                  Iniciar sesión para unirme
                </Link>
                <Link
                  href={`/register?redirect=/invitaciones/${token}`}
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full border-slate-600 text-slate-300 hover:bg-slate-800 justify-center')}
                >
                  Crear cuenta nueva
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

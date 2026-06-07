'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { ApiResponse, Tournament, Quiniela } from '@/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NuevaQuinielaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [form, setForm] = useState({
    name: '',
    tournament_id: '',
    type: 'private' as 'public' | 'private',
    description: '',
    max_participants: '',
  });

  useEffect(() => {
    api
      .get<ApiResponse<Tournament[]>>('/tournaments')
      .then((res) => {
        setTournaments(res.data);
        if (res.data.length > 0) {
          setForm((prev) => ({ ...prev, tournament_id: String(res.data[0].id) }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        tournament_id: parseInt(form.tournament_id),
        type: form.type,
        description: form.description || undefined,
        max_participants: form.max_participants ? parseInt(form.max_participants) : undefined,
      };
      const res = await api.post<ApiResponse<Quiniela>>('/quinielas', payload);
      toast.success('¡Quiniela creada!');
      router.push(`/quinielas/${res.data.slug}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la quiniela');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-slate-400 hover:text-white')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-2xl font-bold text-white">Nueva Quiniela</h2>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Configura tu quiniela</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nombre</Label>
              <Input
                placeholder="Ej: La Quiniela de la Oficina"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Torneo</Label>
              <select
                value={form.tournament_id}
                onChange={(e) => setForm({ ...form, tournament_id: e.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Descripción (opcional)</Label>
              <Input
                placeholder="Describe tu quiniela..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Máx. participantes (opcional)</Label>
              <Input
                type="number"
                placeholder="Sin límite"
                min={2}
                value={form.max_participants}
                onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold mt-2"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear quiniela
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

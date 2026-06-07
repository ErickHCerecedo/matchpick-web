'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { ApiResponse, Tournament } from '@/types';
import { ArrowLeft, Trophy, Loader2 } from 'lucide-react';

export default function NuevoTorneoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    season: new Date().getFullYear().toString(),
    starts_at: '',
    ends_at: '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<ApiResponse<Tournament>>('/tournaments', form);
      toast.success('Torneo creado. Ahora agrega equipos y partidos.');
      router.push(`/torneos/${res.data.slug}/admin`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el torneo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/torneos" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Crear torneo</h2>
          <p className="text-slate-400 text-sm">Define los datos básicos, luego agrega equipos y partidos</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Trophy className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Datos del torneo</CardTitle>
              <CardDescription className="text-slate-400 text-sm">Puedes modificarlos después</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nombre del torneo</Label>
              <Input
                placeholder="Ej: Liga Amigos 2026"
                value={form.name}
                onChange={set('name')}
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Temporada</Label>
              <Input
                placeholder="Ej: 2026"
                value={form.season}
                onChange={set('season')}
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                required
                maxLength={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.starts_at}
                  onChange={set('starts_at')}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Fecha fin</Label>
                <Input
                  type="date"
                  value={form.ends_at}
                  onChange={set('ends_at')}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear y configurar torneo
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

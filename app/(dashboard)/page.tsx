'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Trophy } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { QuinielaCard } from '@/components/quiniela-card';
import { api } from '@/lib/api';
import type { ApiResponse, Quiniela } from '@/types';

export default function DashboardPage() {
  const [quinielas, setQuinielas] = useState<Quiniela[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<Quiniela[]>>('/quinielas')
      .then((res) => setQuinielas(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Mis Quinielas</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {quinielas.length} quiniela{quinielas.length !== 1 ? 's' : ''} activa
            {quinielas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/quinielas/nueva" className={cn(buttonVariants(), 'bg-emerald-500 hover:bg-emerald-600 text-white')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : quinielas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Sin quinielas aún</h3>
          <p className="text-slate-400 text-sm mb-6">
            Crea tu primera quiniela o únete con un código de invitación
          </p>
          <Link href="/quinielas/nueva" className={cn(buttonVariants(), 'bg-emerald-500 hover:bg-emerald-600 text-white')}>
            <Plus className="h-4 w-4 mr-2" />
            Crear quiniela
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quinielas.map((quiniela, i) => (
            <QuinielaCard key={quiniela.id} quiniela={quiniela} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

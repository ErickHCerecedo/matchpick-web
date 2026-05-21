'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Lock, Globe, Trophy } from 'lucide-react';
import type { Quiniela } from '@/types';

interface Props {
  quiniela: Quiniela;
  index: number;
}

export function QuinielaCard({ quiniela, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link href={`/quinielas/${quiniela.slug}`}>
        <Card className="bg-slate-900 border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white leading-tight line-clamp-2">
                {quiniela.name}
              </h3>
              <Badge
                variant="outline"
                className={
                  quiniela.type === 'public'
                    ? 'border-emerald-500/50 text-emerald-400 shrink-0'
                    : 'border-slate-600 text-slate-400 shrink-0'
                }
              >
                {quiniela.type === 'public' ? (
                  <><Globe className="h-3 w-3 mr-1" />Pública</>
                ) : (
                  <><Lock className="h-3 w-3 mr-1" />Privada</>
                )}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Trophy className="h-3 w-3" />
              {quiniela.tournament.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Users className="h-3.5 w-3.5" />
                <span>{quiniela.participants_count} jugadores</span>
              </div>
              {quiniela.my_role === 'admin' && (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                  Admin
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

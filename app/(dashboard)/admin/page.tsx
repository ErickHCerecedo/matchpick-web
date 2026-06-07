'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Tournament } from '@/types';
import {
  Shield, Settings, ToggleLeft, ToggleRight, Plus, Calendar,
  Trophy, Users, Pencil, X, Check, Loader2,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', logo_url: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.replace('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.is_admin) return;
    api.get<ApiResponse<Tournament[]>>('/admin/tournaments')
      .then((res) => setTournaments(res.data))
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [user]);

  const handleToggleActive = async (tournament: Tournament) => {
    setToggling(tournament.id);
    try {
      const res = await api.patch<ApiResponse<Tournament>>(
        `/admin/tournaments/${tournament.id}`,
        { is_active: !tournament.is_active }
      );
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournament.id ? res.data : t))
      );
      toast.success(res.data.is_active ? 'Torneo activado' : 'Torneo desactivado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setToggling(null);
    }
  };

  const startEdit = (tournament: Tournament) => {
    setEditingId(tournament.id);
    setEditForm({
      name:        tournament.name,
      logo_url:    tournament.logo_url ?? '',
      description: tournament.description ?? '',
    });
  };

  const handleSaveEdit = async (tournament: Tournament) => {
    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<Tournament>>(
        `/admin/tournaments/${tournament.id}`,
        {
          name:        editForm.name.trim() || undefined,
          logo_url:    editForm.logo_url.trim() || null,
          description: editForm.description.trim() || null,
        }
      );
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournament.id ? res.data : t))
      );
      setEditingId(null);
      toast.success('Torneo actualizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user?.is_admin) return null;

  const active   = tournaments.filter((t) => t.is_active);
  const inactive = tournaments.filter((t) => !t.is_active);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Panel Super Admin</h2>
            <p className="text-sm text-slate-400">Gestión global de torneos</p>
          </div>
        </div>
        <Link href="/torneos/nuevo">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo torneo
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {!loadingData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
            <p className="text-2xl font-bold text-white">{tournaments.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-emerald-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{active.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Activos</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
            <p className="text-2xl font-bold text-slate-500">{inactive.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Inactivos</p>
          </div>
        </div>
      )}

      {/* Tournament list */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Todos los torneos
        </h3>

        {loadingData ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-slate-800 rounded-xl" />
          ))
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay torneos registrados.</p>
          </div>
        ) : (
          [...active, ...inactive].map((tournament) => (
            <div
              key={tournament.id}
              className={`rounded-xl bg-slate-900 border transition-colors ${
                tournament.is_active ? 'border-slate-700' : 'border-slate-800/60 opacity-70'
              }`}
            >
              {/* Row */}
              <div className="flex items-center gap-3 p-4">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{tournament.name}</p>
                    <Badge
                      variant="outline"
                      className={
                        tournament.is_active
                          ? 'border-emerald-500/50 text-emerald-400 text-[10px] h-5'
                          : 'border-slate-600 text-slate-500 text-[10px] h-5'
                      }
                    >
                      {tournament.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {tournament.is_custom && (
                      <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-[10px] h-5">
                        Custom
                      </Badge>
                    )}
                  </div>
                  {tournament.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{tournament.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(tournament.starts_at).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {' — '}
                      {new Date(tournament.ends_at).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {tournament.creator && (
                    <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" />
                      Creado por {tournament.creator.name}
                    </p>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => (editingId === tournament.id ? setEditingId(null) : startEdit(tournament))}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Editar torneo"
                  >
                    {editingId === tournament.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleToggleActive(tournament)}
                    disabled={toggling === tournament.id}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                    title={tournament.is_active ? 'Desactivar torneo' : 'Activar torneo'}
                  >
                    {tournament.is_active ? (
                      <ToggleRight className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-600" />
                    )}
                  </button>
                  <Link href={`/torneos/${tournament.slug}/admin`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 h-8 px-3"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Gestionar
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Inline edit panel */}
              <AnimatePresence initial={false}>
                {editingId === tournament.id && (
                  <motion.div
                    key={`edit-${tournament.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-slate-800 space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-3">Editar torneo</p>
                      <div className="space-y-1.5">
                        <Label className="text-slate-400 text-xs">Nombre</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm h-9"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-400 text-xs">URL del logo <span className="text-slate-600">(opcional)</span></Label>
                        <Input
                          value={editForm.logo_url}
                          onChange={(e) => setEditForm((p) => ({ ...p, logo_url: e.target.value }))}
                          placeholder="https://ejemplo.com/logo.png"
                          className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-400 text-xs">Descripción / subtítulo <span className="text-slate-600">(opcional)</span></Label>
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          placeholder="Ej: Fase de grupos · 48 selecciones"
                          className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm h-9"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={saving}
                          onClick={() => handleSaveEdit(tournament)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Access info */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-1.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Acceso super admin</p>
        <p className="text-xs text-slate-500">
          Esta sección solo es visible para usuarios con <code className="text-emerald-400 bg-slate-800 px-1 rounded">is_admin = true</code> en la base de datos.
        </p>
        <p className="text-xs text-slate-500">
          Para activar el acceso en la cuenta de un usuario, ejecuta en el servidor de Laravel:
        </p>
        <code className="block text-xs text-emerald-300 bg-slate-800 rounded-lg px-3 py-2 font-mono leading-relaxed">
          php artisan tinker{'\n'}
          {'User::where(\'email\', \'tu@email.com\')->update([\'is_admin\' => true]);'}
        </code>
      </div>
    </motion.div>
  );
}

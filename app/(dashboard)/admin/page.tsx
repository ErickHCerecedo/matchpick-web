'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import type { ApiResponse, Tournament } from '@/types';
import {
  Shield, Settings, ToggleLeft, ToggleRight, Plus, Calendar,
  Trophy, Users, Pencil, X, Check, Loader2, ImageIcon, Eye, EyeOff,
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

  // Site config
  const { bgUrl, setBgUrl, saving: savingBg } = useSiteConfig();
  const [bgInput, setBgInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setBgInput(bgUrl ?? '');
    setShowPreview(!!bgUrl);
  }, [bgUrl]);

  const handleSaveBg = async () => {
    const url = bgInput.trim();
    try {
      await setBgUrl(url || null);
      setShowPreview(!!url);
      setPreviewError(false);
      toast.success(url ? 'Fondo de pantalla aplicado a todos los dispositivos' : 'Fondo de pantalla eliminado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la configuración');
    }
  };

  const handleRemoveBg = async () => {
    try {
      await setBgUrl(null);
      setBgInput('');
      setShowPreview(false);
      setPreviewError(false);
      toast.success('Fondo de pantalla eliminado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el fondo');
    }
  };

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

  // Only non-custom tournaments are managed from the super admin panel
  const officialTournaments = tournaments.filter((t) => !t.is_custom);
  const active   = officialTournaments.filter((t) => t.is_active);
  const inactive = officialTournaments.filter((t) => !t.is_active);

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
            <p className="text-sm text-slate-400">Gestión global</p>
          </div>
        </div>
        <Link href="/torneos/nuevo">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo torneo
          </Button>
        </Link>
      </div>

      {/* ── Menu tabs ── */}
      <Tabs defaultValue="tournaments">
        <TabsList className="!grid grid-cols-2 w-full !h-auto bg-slate-900 border border-slate-700/60 p-1 gap-1 rounded-xl mb-1">
          <TabsTrigger
            value="tournaments"
            className="flex items-center gap-1.5 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <Trophy className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">Partidos</span>
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="flex items-center gap-1.5 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">Configuración</span>
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════ PARTIDOS ════════════════════ */}
        <TabsContent value="tournaments" className="mt-4 space-y-4">
          {/* Stats */}
          {!loadingData && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                <p className="text-2xl font-bold text-white">{officialTournaments.length}</p>
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
            {loadingData ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 bg-slate-800 rounded-xl" />
              ))
            ) : officialTournaments.length === 0 ? (
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
                    </div>

                    {/* Actions */}
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
        </TabsContent>

        {/* ════════════════════ CONFIGURACIÓN ════════════════════ */}
        <TabsContent value="config" className="mt-4 space-y-4">
          {/* Fondo de pantalla */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <div className="p-1.5 rounded-lg bg-slate-800">
                <ImageIcon className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Fondo de pantalla global</p>
                <p className="text-xs text-slate-500">Se aplica a toda la aplicación en todos los dispositivos</p>
              </div>
              {bgUrl && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Activo
                </span>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Live preview */}
              <AnimatePresence>
                {showPreview && bgInput.trim() && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="relative rounded-xl overflow-hidden h-32 border border-slate-700">
                      {!previewError ? (
                        <>
                          <img
                            src={bgInput.trim()}
                            alt="Preview fondo"
                            className="w-full h-full object-cover"
                            onError={() => setPreviewError(true)}
                          />
                          <div className="absolute inset-0 bg-slate-950/65" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <Eye className="h-4 w-4 text-white/40" />
                            <span className="text-xs text-white/50 font-medium">Vista previa</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-800/60">
                          <EyeOff className="h-5 w-5 text-slate-500" />
                          <span className="text-xs text-slate-500">No se pudo cargar la imagen</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">URL de la imagen de fondo</Label>
                <Input
                  value={bgInput}
                  onChange={(e) => {
                    setBgInput(e.target.value);
                    setPreviewError(false);
                    setShowPreview(!!e.target.value.trim());
                  }}
                  placeholder="https://res.cloudinary.com/…/imagen.png"
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm h-9"
                />
                <p className="text-[11px] text-slate-600">
                  Deja vacío y guarda para quitar el fondo. Usa imágenes de alta resolución (mínimo 1920×1080).
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleSaveBg}
                  disabled={savingBg || bgInput.trim() === (bgUrl ?? '')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40"
                >
                  {savingBg ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {bgInput.trim() ? 'Aplicar fondo' : 'Guardar cambios'}
                </Button>
                {bgUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRemoveBg}
                    disabled={savingBg}
                    className="border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Quitar fondo
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Access info */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Acceso super admin</p>
            <p className="text-xs text-slate-500">
              Solo visible para usuarios con <code className="text-emerald-400 bg-slate-800 px-1 rounded">is_admin = true</code> en la base de datos.
            </p>
            <p className="text-xs text-slate-500">Para activar en una cuenta:</p>
            <code className="block text-xs text-emerald-300 bg-slate-800 rounded-lg px-3 py-2 font-mono leading-relaxed">
              php artisan tinker{'\n'}
              {'User::where(\'email\', \'tu@email.com\')->update([\'is_admin\' => true]);'}
            </code>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

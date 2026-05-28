'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { ApiResponse, Tournament, Round, CustomTeam, CustomMatch } from '@/types';
import {
  ArrowLeft, Plus, Trash2, Loader2, Users, CalendarDays, Trophy,
  Pencil, Check, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helper sub-components ──────────────────────────────────────────────────

function TeamAvatar({ team, size = 'md' }: { team: CustomTeam; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-5 h-4' : 'w-9 h-9';
  const text = size === 'sm' ? 'text-[9px]' : 'text-xs';
  if (team.logo_url) {
    return (
      <img
        src={team.logo_url}
        alt={team.short_name}
        className={cn(dim, 'object-cover rounded-sm shrink-0')}
      />
    );
  }
  return (
    <div className={cn(dim, 'rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0')}>
      <span className={cn(text, 'font-bold text-slate-400')}>{team.short_name.slice(0, 2)}</span>
    </div>
  );
}

function TeamSelect({
  value, onChange, teams, excludeId,
}: {
  value: string;
  onChange: (v: string) => void;
  teams: CustomTeam[];
  excludeId?: number;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      required
    >
      <option value="">Seleccionar</option>
      {teams
        .filter((t) => !excludeId || t.id !== excludeId)
        .map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
    </select>
  );
}

function MatchTeamFlag({
  teamId, teams,
}: {
  teamId: number;
  teams: CustomTeam[];
}) {
  const team = teams.find((t) => t.id === teamId);
  if (!team?.logo_url) return null;
  return (
    <img
      src={team.logo_url}
      alt={team.short_name}
      className="w-5 h-3.5 object-cover rounded-sm shrink-0"
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TorneoAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<CustomTeam[]>([]);
  const [rounds, setRounds] = useState<(Round & { matches_count: number })[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [matches, setMatches] = useState<CustomMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loading, setLoading] = useState(true);

  // Team state
  const [teamForm, setTeamForm] = useState({ name: '', short_name: '', logo_url: '' });
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editTeamForm, setEditTeamForm] = useState({ name: '', short_name: '', logo_url: '' });

  // Round state
  const [roundForm, setRoundForm] = useState({ name: '' });
  const [showRoundForm, setShowRoundForm] = useState(false);

  // Match state
  const [matchForm, setMatchForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editMatchForm, setEditMatchForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });

  const [saving, setSaving] = useState(false);

  // ── Load initial data ────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get<ApiResponse<Tournament>>(`/tournaments/${slug}`),
      api.get<ApiResponse<CustomTeam[]>>(`/tournaments/${slug}/teams`),
      api.get<ApiResponse<(Round & { matches_count: number })[]>>(`/tournaments/${slug}/rounds`),
    ])
      .then(([tRes, teRes, rRes]) => {
        setTournament(tRes.data);
        setTeams(teRes.data);
        setRounds(rRes.data);
        if (rRes.data.length > 0) setSelectedRoundId(rRes.data[0].id);
      })
      .catch(() => {
        toast.error('No tienes acceso a este panel.');
        router.push('/torneos');
      })
      .finally(() => setLoading(false));
  }, [slug, router]);

  useEffect(() => {
    if (!selectedRoundId || !slug) return;
    setLoadingMatches(true);
    api.get<ApiResponse<CustomMatch[]>>(`/tournaments/${slug}/rounds/${selectedRoundId}/matches`)
      .then((res) => setMatches(res.data))
      .catch(console.error)
      .finally(() => setLoadingMatches(false));
  }, [selectedRoundId, slug]);

  // ── Teams ────────────────────────────────────────────────────────────────

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<CustomTeam>>(`/tournaments/${slug}/teams`, {
        name: teamForm.name,
        short_name: teamForm.short_name,
        logo_url: teamForm.logo_url || null,
      });
      setTeams((prev) => [...prev, res.data]);
      setTeamForm({ name: '', short_name: '', logo_url: '' });
      setShowTeamForm(false);
      toast.success('Equipo agregado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTeam = async (teamId: number) => {
    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<CustomTeam>>(`/tournaments/${slug}/teams/${teamId}`, {
        name: editTeamForm.name,
        short_name: editTeamForm.short_name,
        logo_url: editTeamForm.logo_url || null,
      });
      setTeams((prev) => prev.map((t) => (t.id === teamId ? res.data : t)));
      setEditingTeamId(null);
      toast.success('Equipo actualizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    try {
      await api.delete(`/tournaments/${slug}/teams/${teamId}`);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      toast.success('Equipo eliminado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar equipo');
    }
  };

  const startEditTeam = (team: CustomTeam) => {
    setEditingTeamId(team.id);
    setEditTeamForm({ name: team.name, short_name: team.short_name, logo_url: team.logo_url ?? '' });
  };

  // ── Rounds ───────────────────────────────────────────────────────────────

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<Round & { matches_count: number }>>(
        `/tournaments/${slug}/rounds`,
        roundForm
      );
      setRounds((prev) => [...prev, res.data]);
      setRoundForm({ name: '' });
      setShowRoundForm(false);
      if (!selectedRoundId) setSelectedRoundId(res.data.id);
      toast.success('Jornada agregada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar jornada');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRound = async (roundId: number) => {
    try {
      await api.delete(`/tournaments/${slug}/rounds/${roundId}`);
      const remaining = rounds.filter((r) => r.id !== roundId);
      setRounds(remaining);
      if (selectedRoundId === roundId) {
        setSelectedRoundId(remaining[0]?.id ?? null);
      }
      toast.success('Jornada eliminada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar jornada');
    }
  };

  // ── Matches ──────────────────────────────────────────────────────────────

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoundId) return;
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<CustomMatch>>(
        `/tournaments/${slug}/rounds/${selectedRoundId}/matches`,
        {
          ...matchForm,
          home_team_id: Number(matchForm.home_team_id),
          away_team_id: Number(matchForm.away_team_id),
        }
      );
      setMatches((prev) => [...prev, res.data]);
      setMatchForm({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });
      setShowMatchForm(false);
      setRounds((prev) =>
        prev.map((r) =>
          r.id === selectedRoundId ? { ...r, matches_count: r.matches_count + 1 } : r
        )
      );
      toast.success('Partido agregado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar partido');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMatch = async (matchId: number) => {
    if (!selectedRoundId) return;
    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<CustomMatch>>(
        `/tournaments/${slug}/rounds/${selectedRoundId}/matches/${matchId}`,
        {
          home_team_id: Number(editMatchForm.home_team_id),
          away_team_id: Number(editMatchForm.away_team_id),
          scheduled_at: editMatchForm.scheduled_at,
          venue: editMatchForm.venue || null,
        }
      );
      setMatches((prev) => prev.map((m) => (m.id === matchId ? res.data : m)));
      setEditingMatchId(null);
      toast.success('Partido actualizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar partido');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMatch = async (matchId: number) => {
    if (!selectedRoundId) return;
    try {
      await api.delete(`/tournaments/${slug}/rounds/${selectedRoundId}/matches/${matchId}`);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      setRounds((prev) =>
        prev.map((r) =>
          r.id === selectedRoundId ? { ...r, matches_count: Math.max(0, r.matches_count - 1) } : r
        )
      );
      toast.success('Partido eliminado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar partido');
    }
  };

  const startEditMatch = (match: CustomMatch) => {
    setEditingMatchId(match.id);
    // Convert ISO to datetime-local format (strip seconds + timezone offset)
    const d = new Date(match.scheduled_at);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditMatchForm({
      home_team_id: String(match.home_team.id),
      away_team_id: String(match.away_team.id),
      scheduled_at: local,
      venue: match.venue ?? '',
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52 bg-slate-800" />
        <Skeleton className="h-12 bg-slate-800 rounded-xl" />
        <Skeleton className="h-64 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!tournament) {
    return <p className="text-slate-400">Torneo no encontrado.</p>;
  }

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/torneos"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white truncate">{tournament.name}</h2>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs shrink-0">
              Admin
            </Badge>
          </div>
          <p className="text-slate-500 text-sm">{tournament.season}</p>
        </div>
        <Link href={`/torneos/${slug}`}>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:text-white shrink-0 text-xs"
          >
            Ver torneo
          </Button>
        </Link>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="teams">
        <TabsList className="!grid grid-cols-2 w-full !h-auto bg-slate-800 border border-slate-700/60 p-1 gap-1 rounded-xl mb-1">
          <TabsTrigger
            value="teams"
            className="flex items-center gap-1.5 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">Equipos ({teams.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="flex items-center gap-1.5 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">Calendario</span>
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════ EQUIPOS ════════════════════ */}
        <TabsContent value="teams" className="mt-4 space-y-3">
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{teams.length} equipos registrados</p>
            <Button
              size="sm"
              onClick={() => { setShowTeamForm((v) => !v); setEditingTeamId(null); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar equipo
            </Button>
          </div>

          {/* Add team form */}
          <AnimatePresence initial={false}>
            {showTeamForm && (
              <motion.form
                key="team-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleAddTeam}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-emerald-500/20 bg-slate-900 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Nuevo equipo
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Nombre</Label>
                      <Input
                        placeholder="México"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm((p) => ({ ...p, name: e.target.value }))}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Abreviatura</Label>
                      <Input
                        placeholder="MEX"
                        value={teamForm.short_name}
                        onChange={(e) => setTeamForm((p) => ({ ...p, short_name: e.target.value }))}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">
                      URL de imagen / bandera{' '}
                      <span className="text-slate-600">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="https://ejemplo.com/bandera.png"
                      value={teamForm.logo_url}
                      onChange={(e) => setTeamForm((p) => ({ ...p, logo_url: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTeamForm(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={saving}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Teams list */}
          {teams.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-slate-800">
              <Trophy className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aún no hay equipos. Agrega el primero.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
                >
                  {editingTeamId === team.id ? (
                    /* ── Edit row ── */
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">Nombre</Label>
                          <Input
                            value={editTeamForm.name}
                            onChange={(e) =>
                              setEditTeamForm((p) => ({ ...p, name: e.target.value }))
                            }
                            className="bg-slate-800 border-slate-600 text-white text-sm h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">Abreviatura</Label>
                          <Input
                            value={editTeamForm.short_name}
                            onChange={(e) =>
                              setEditTeamForm((p) => ({ ...p, short_name: e.target.value }))
                            }
                            className="bg-slate-800 border-slate-600 text-white text-sm h-8"
                            maxLength={10}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-xs">URL de imagen</Label>
                        <Input
                          value={editTeamForm.logo_url}
                          onChange={(e) =>
                            setEditTeamForm((p) => ({ ...p, logo_url: e.target.value }))
                          }
                          placeholder="https://..."
                          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm h-8"
                        />
                      </div>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(null)}
                          className="p-1.5 rounded text-slate-500 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTeam(team.id)}
                          disabled={saving}
                          className="p-1.5 rounded text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── View row ── */
                    <div className="flex items-center gap-3 px-4 py-3">
                      <TeamAvatar team={team} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{team.name}</p>
                        <p className="text-xs text-slate-500">{team.short_name}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => startEditTeam(team)}
                          className="p-1.5 rounded text-slate-500 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveTeam(team.id)}
                          className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ════════════════════ CALENDARIO ════════════════════ */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          {/* Round chips section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Jornadas / Grupos
              </p>
              <button
                onClick={() => setShowRoundForm((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva
              </button>
            </div>

            {/* Scrollable round chips */}
            {rounds.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {rounds.map((round) => (
                  <div key={round.id} className="shrink-0 flex items-center gap-0.5">
                    <button
                      onClick={() => setSelectedRoundId(round.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap',
                        round.id === selectedRoundId
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                      )}
                    >
                      {round.name}
                      {round.matches_count > 0 && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none',
                            round.id === selectedRoundId
                              ? 'bg-emerald-500/30 text-emerald-300'
                              : 'bg-slate-700 text-slate-500'
                          )}
                        >
                          {round.matches_count}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveRound(round.id)}
                      className="p-1 rounded text-slate-700 hover:text-red-400 transition-colors"
                      title="Eliminar jornada"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add round inline form */}
            <AnimatePresence initial={false}>
              {showRoundForm && (
                <motion.form
                  key="round-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleAddRound}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Ej: Grupo A, Jornada 1, Semifinal..."
                      value={roundForm.name}
                      onChange={(e) => setRoundForm({ name: e.target.value })}
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm h-8"
                      required
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={saving}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3 shrink-0 text-xs"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Agregar'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowRoundForm(false)}
                      className="p-2 rounded text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Match panel */}
          {!selectedRoundId ? (
            <p className="text-slate-500 text-sm text-center py-10">
              {rounds.length === 0
                ? 'Agrega una jornada para comenzar.'
                : 'Selecciona una jornada para ver los partidos.'}
            </p>
          ) : (
            <div className="space-y-3">
              {/* Matches header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{selectedRound?.name}</p>
                {teams.length >= 2 && (
                  <Button
                    size="sm"
                    onClick={() => { setShowMatchForm((v) => !v); setEditingMatchId(null); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Partido
                  </Button>
                )}
              </div>

              {teams.length < 2 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400 text-center">
                  Necesitas al menos 2 equipos para agregar partidos.
                </div>
              )}

              {/* Add match form */}
              <AnimatePresence initial={false}>
                {showMatchForm && teams.length >= 2 && (
                  <motion.form
                    key="match-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleAddMatch}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-emerald-500/20 bg-slate-900 p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        Nuevo partido
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">Local</Label>
                          <TeamSelect
                            value={matchForm.home_team_id}
                            onChange={(v) => setMatchForm((p) => ({ ...p, home_team_id: v }))}
                            teams={teams}
                            excludeId={Number(matchForm.away_team_id)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">Visitante</Label>
                          <TeamSelect
                            value={matchForm.away_team_id}
                            onChange={(v) => setMatchForm((p) => ({ ...p, away_team_id: v }))}
                            teams={teams}
                            excludeId={Number(matchForm.home_team_id)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">Fecha y hora</Label>
                          <Input
                            type="datetime-local"
                            value={matchForm.scheduled_at}
                            onChange={(e) =>
                              setMatchForm((p) => ({ ...p, scheduled_at: e.target.value }))
                            }
                            className="bg-slate-800 border-slate-600 text-white text-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">
                            Sede{' '}
                            <span className="text-slate-600">(opcional)</span>
                          </Label>
                          <Input
                            placeholder="Estadio..."
                            value={matchForm.venue}
                            onChange={(e) =>
                              setMatchForm((p) => ({ ...p, venue: e.target.value }))
                            }
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMatchForm(false)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={saving}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 mr-1" />
                          )}
                          Guardar partido
                        </Button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Matches list */}
              {loadingMatches ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 bg-slate-800 rounded-xl" />
                  <Skeleton className="h-16 bg-slate-800 rounded-xl" />
                  <Skeleton className="h-16 bg-slate-800 rounded-xl" />
                </div>
              ) : matches.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  Sin partidos en esta jornada.
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
                    >
                      {editingMatchId === match.id ? (
                        /* ── Edit match row ── */
                        <div className="p-4 space-y-3">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                            Editar partido
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Local</Label>
                              <TeamSelect
                                value={editMatchForm.home_team_id}
                                onChange={(v) =>
                                  setEditMatchForm((p) => ({ ...p, home_team_id: v }))
                                }
                                teams={teams}
                                excludeId={Number(editMatchForm.away_team_id)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Visitante</Label>
                              <TeamSelect
                                value={editMatchForm.away_team_id}
                                onChange={(v) =>
                                  setEditMatchForm((p) => ({ ...p, away_team_id: v }))
                                }
                                teams={teams}
                                excludeId={Number(editMatchForm.home_team_id)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Fecha y hora</Label>
                              <Input
                                type="datetime-local"
                                value={editMatchForm.scheduled_at}
                                onChange={(e) =>
                                  setEditMatchForm((p) => ({
                                    ...p,
                                    scheduled_at: e.target.value,
                                  }))
                                }
                                className="bg-slate-800 border-slate-600 text-white text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Sede</Label>
                              <Input
                                placeholder="Estadio..."
                                value={editMatchForm.venue}
                                onChange={(e) =>
                                  setEditMatchForm((p) => ({ ...p, venue: e.target.value }))
                                }
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingMatchId(null)}
                              className="p-1.5 rounded text-slate-500 hover:text-white transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMatch(match.id)}
                              disabled={saving}
                              className="p-1.5 rounded text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── View match row ── */
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            {/* Teams line */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MatchTeamFlag teamId={match.home_team.id} teams={teams} />
                              <span className="text-sm font-medium text-white truncate">
                                {match.home_team.name}
                              </span>
                              <span className="text-slate-600 text-xs shrink-0">vs</span>
                              <span className="text-sm font-medium text-white truncate">
                                {match.away_team.name}
                              </span>
                              <MatchTeamFlag teamId={match.away_team.id} teams={teams} />
                            </div>
                            {/* Date + venue */}
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(match.scheduled_at).toLocaleString('es-MX', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {match.venue && (
                                <> · <span className="text-slate-600">{match.venue}</span></>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => startEditMatch(match)}
                              className="p-1.5 rounded text-slate-500 hover:text-white transition-colors"
                              title="Editar partido"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveMatch(match.id)}
                              className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors"
                              title="Eliminar partido"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

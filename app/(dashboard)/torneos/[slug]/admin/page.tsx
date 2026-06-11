'use client';

import { useEffect, useState, useRef } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, Tournament, Round, CustomTeam, CustomMatch, MatchResult } from '@/types';
import {
  ArrowLeft, Plus, Trash2, Loader2, Users, CalendarDays, Trophy,
  Pencil, Check, X, Shield, ChevronRight, RefreshCw, Settings2, ImageIcon,
} from 'lucide-react';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';
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
      className="w-full rounded-lg bg-slate-950 border border-slate-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

function MatchTeamFlag({ teamId, teams }: { teamId: number | undefined; teams: CustomTeam[] }) {
  if (!teamId) return <FlagPlaceholder size="sm" />;
  const team = teams.find((t) => t.id === teamId);
  if (!team?.logo_url) return <FlagPlaceholder size="sm" />;
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
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<CustomTeam[]>([]);
  const [rounds, setRounds] = useState<(Round & { matches_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  // Team state
  const [teamForm, setTeamForm] = useState({ name: '', short_name: '', logo_url: '' });
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editTeamForm, setEditTeamForm] = useState({ name: '', short_name: '', logo_url: '' });

  // Accordion state — replaces selectedRoundId + matches + loadingMatches + showRoundForm
  const [expandedRoundId, setExpandedRoundId] = useState<number | null>(null);
  const [matchesByRound, setMatchesByRound] = useState<Record<number, CustomMatch[]>>({});
  const [loadingRoundId, setLoadingRoundId] = useState<number | null>(null);
  const [roundNameInput, setRoundNameInput] = useState('');
  const roundInputRef = useRef<HTMLInputElement>(null);

  // Match state (scoped to the currently expanded round)
  const [matchForm, setMatchForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editMatchForm, setEditMatchForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });

  // Result state
  const [resultMatchId, setResultMatchId] = useState<number | null>(null);
  const [resultForm, setResultForm] = useState({ home_score: '', away_score: '' });
  const [savingResult, setSavingResult] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [saving, setSaving] = useState(false);

  // Config state (custom tournament settings)
  const [configName, setConfigName] = useState('');
  const [configLogo, setConfigLogo] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Load initial data ──────────────────────────────────────────────────

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get<ApiResponse<Tournament>>(`/tournaments/${slug}`),
      api.get<ApiResponse<CustomTeam[]>>(`/tournaments/${slug}/teams`),
      api.get<ApiResponse<(Round & { matches_count: number })[]>>(`/tournaments/${slug}/rounds`),
    ])
      .then(async ([tRes, teRes, rRes]) => {
        setTournament(tRes.data);
        setConfigName(tRes.data.name);
        setConfigLogo(tRes.data.logo_url ?? '');
        setTeams(teRes.data);
        setRounds(rRes.data);
        // Auto-expand the first round that has matches, or just the first round
        const firstRound =
          rRes.data.find((r) => r.matches_count > 0) ?? rRes.data[0];
        if (firstRound) {
          setExpandedRoundId(firstRound.id);
          const mRes = await api.get<ApiResponse<CustomMatch[]>>(
            `/tournaments/${slug}/rounds/${firstRound.id}/matches`
          );
          setMatchesByRound({ [firstRound.id]: mRes.data });
        }
      })
      .catch(() => {
        toast.error('No tienes acceso a este panel.');
        router.push('/torneos');
      })
      .finally(() => setLoading(false));
  }, [slug, router]);

  // ── Accordion expand ───────────────────────────────────────────────────

  const handleExpandRound = async (roundId: number) => {
    if (expandedRoundId === roundId) {
      setExpandedRoundId(null);
      return;
    }
    // Reset match UI when switching rounds
    setShowMatchForm(false);
    setEditingMatchId(null);
    setExpandedRoundId(roundId);

    if (matchesByRound[roundId] !== undefined) return; // already cached

    setLoadingRoundId(roundId);
    try {
      const res = await api.get<ApiResponse<CustomMatch[]>>(
        `/tournaments/${slug}/rounds/${roundId}/matches`
      );
      setMatchesByRound((prev) => ({ ...prev, [roundId]: res.data }));
    } catch {
      toast.error('Error al cargar partidos');
      setExpandedRoundId(null);
    } finally {
      setLoadingRoundId(null);
    }
  };

  // ── Teams ──────────────────────────────────────────────────────────────

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
      const endpoint = tournament!.is_custom
        ? `/tournaments/${slug}/teams/${teamId}`
        : `/admin/teams/${teamId}`;
      const res = await api.patch<ApiResponse<CustomTeam>>(endpoint, {
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

  // ── Rounds ─────────────────────────────────────────────────────────────

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundNameInput.trim()) return;
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<Round & { matches_count: number }>>(
        `/tournaments/${slug}/rounds`,
        { name: roundNameInput.trim() }
      );
      setRounds((prev) => [...prev, res.data]);
      setRoundNameInput('');
      // Auto-expand the new round (empty, ready to add matches)
      setExpandedRoundId(res.data.id);
      setMatchesByRound((prev) => ({ ...prev, [res.data.id]: [] }));
      setShowMatchForm(false);
      setEditingMatchId(null);
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
      setRounds((prev) => prev.filter((r) => r.id !== roundId));
      setMatchesByRound((prev) => {
        const next = { ...prev };
        delete next[roundId];
        return next;
      });
      if (expandedRoundId === roundId) {
        setExpandedRoundId(null);
        setShowMatchForm(false);
        setEditingMatchId(null);
      }
      toast.success('Jornada eliminada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar jornada');
    }
  };

  // ── Matches ────────────────────────────────────────────────────────────

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedRoundId) return;
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<CustomMatch>>(
        `/tournaments/${slug}/rounds/${expandedRoundId}/matches`,
        {
          ...matchForm,
          home_team_id: Number(matchForm.home_team_id),
          away_team_id: Number(matchForm.away_team_id),
          // datetime-local value is Mexico Central (UTC-6); convert to UTC for the backend.
          scheduled_at: matchForm.scheduled_at
            ? new Date(matchForm.scheduled_at + ':00-06:00').toISOString()
            : matchForm.scheduled_at,
        }
      );
      setMatchesByRound((prev) => ({
        ...prev,
        [expandedRoundId]: [...(prev[expandedRoundId] ?? []), res.data],
      }));
      setMatchForm({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });
      setShowMatchForm(false);
      setRounds((prev) =>
        prev.map((r) =>
          r.id === expandedRoundId ? { ...r, matches_count: r.matches_count + 1 } : r
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
    if (!expandedRoundId) return;
    setSaving(true);
    try {
      const isCustom = tournament!.is_custom;
      const isAdmin  = !!user?.is_admin;
      const endpoint = isCustom
        ? `/tournaments/${slug}/rounds/${expandedRoundId}/matches/${matchId}`
        : `/admin/matches/${matchId}`;
      // datetime-local value is in Mexico Central time (UTC-6); convert to UTC ISO for the backend.
      const scheduledAtUTC = editMatchForm.scheduled_at
        ? new Date(editMatchForm.scheduled_at + ':00-06:00').toISOString()
        : editMatchForm.scheduled_at;
      const payload = (isCustom || isAdmin) && editMatchForm.home_team_id
        ? {
            home_team_id: Number(editMatchForm.home_team_id),
            away_team_id: Number(editMatchForm.away_team_id),
            scheduled_at: scheduledAtUTC,
            venue: editMatchForm.venue || null,
          }
        : { scheduled_at: scheduledAtUTC, venue: editMatchForm.venue || null };
      const res = await api.patch<ApiResponse<Partial<CustomMatch>>>(endpoint, payload);
      setMatchesByRound((prev) => ({
        ...prev,
        [expandedRoundId]: (prev[expandedRoundId] ?? []).map((m) =>
          m.id === matchId ? { ...m, ...res.data } : m
        ),
      }));
      setEditingMatchId(null);
      toast.success('Partido actualizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar partido');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMatch = async (matchId: number) => {
    if (!expandedRoundId) return;
    try {
      await api.delete(
        `/tournaments/${slug}/rounds/${expandedRoundId}/matches/${matchId}`
      );
      setMatchesByRound((prev) => ({
        ...prev,
        [expandedRoundId]: (prev[expandedRoundId] ?? []).filter((m) => m.id !== matchId),
      }));
      setRounds((prev) =>
        prev.map((r) =>
          r.id === expandedRoundId
            ? { ...r, matches_count: Math.max(0, r.matches_count - 1) }
            : r
        )
      );
      toast.success('Partido eliminado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar partido');
    }
  };

  const startEditMatch = (match: CustomMatch) => {
    setEditingMatchId(match.id);
    // Convert UTC → Mexico Central (UTC-6) for the datetime-local input.
    // Hard-coded offset so it works regardless of the browser's system timezone.
    const d = new Date(match.scheduled_at);
    const local = new Date(d.getTime() - 6 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    setEditMatchForm({
      home_team_id: match.home_team ? String(match.home_team.id) : '',
      away_team_id: match.away_team ? String(match.away_team.id) : '',
      scheduled_at: local,
      venue: match.venue ?? '',
    });
  };

  // ── Results ───────────────────────────────────────────────────────────

  const startSetResult = (match: CustomMatch) => {
    setResultMatchId(match.id);
    setResultForm({
      home_score: match.result != null ? String(match.result.home_score) : '',
      away_score: match.result != null ? String(match.result.away_score) : '',
    });
    setEditingMatchId(null);
    setShowMatchForm(false);
  };

  const handleSetResult = async (match: CustomMatch) => {
    if (!expandedRoundId) return;
    setSavingResult(true);
    try {
      const endpoint = tournament!.is_custom
        ? `/tournaments/${slug}/rounds/${expandedRoundId}/matches/${match.id}/result`
        : `/admin/matches/${match.id}/results`;
      const res = await api.post<ApiResponse<MatchResult>>(endpoint, {
        home_score: Number(resultForm.home_score),
        away_score: Number(resultForm.away_score),
      });
      setMatchesByRound((prev) => ({
        ...prev,
        [expandedRoundId]: (prev[expandedRoundId] ?? []).map((m) =>
          m.id === match.id ? { ...m, result: res.data, status: 'finished' } : m
        ),
      }));
      setResultMatchId(null);
      toast.success('Resultado guardado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar resultado');
    } finally {
      setSavingResult(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post<ApiResponse<{ synced: number }>>(
        `/admin/tournaments/${slug}/sync-results`,
        {}
      );
      toast.success(res.message ?? `${res.data.synced} resultado(s) sincronizados.`);
      if (expandedRoundId) {
        const mRes = await api.get<ApiResponse<CustomMatch[]>>(
          `/tournaments/${slug}/rounds/${expandedRoundId}/matches`
        );
        setMatchesByRound((prev) => ({ ...prev, [expandedRoundId]: mRes.data }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar resultados');
    } finally {
      setSyncing(false);
    }
  };

  // ── Config ────────────────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    if (!configName.trim()) return;
    setSavingConfig(true);
    try {
      const res = await api.patch<ApiResponse<Tournament>>(`/tournaments/${slug}`, {
        name: configName.trim(),
        logo_url: configLogo.trim() || null,
      });
      setTournament(res.data);
      setConfigName(res.data.name);
      setConfigLogo(res.data.logo_url ?? '');
      toast.success('Torneo actualizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

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
        <TabsList className={cn('!grid w-full !h-auto bg-slate-900 border border-slate-700/60 p-1 gap-1 rounded-xl mb-1', tournament.is_custom ? 'grid-cols-3' : 'grid-cols-2')}>
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
          {tournament.is_custom && (
            <TabsTrigger
              value="config"
              className="flex items-center gap-1.5 py-2.5 h-auto rounded-lg text-slate-400 data-active:bg-emerald-500/20 data-active:text-emerald-400 hover:text-white transition-colors"
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">Config</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ════════════════════ EQUIPOS ════════════════════ */}
        <TabsContent value="teams" className="mt-4 space-y-3">
          {!tournament.is_custom && !user?.is_admin && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2.5 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              Los equipos de este torneo se gestionan vía seeder / API externa y son de solo lectura aquí.
            </div>
          )}
          {!tournament.is_custom && user?.is_admin && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-400">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              Modo Super Admin: puedes editar nombres de equipos.
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{teams.length} equipos registrados</p>
            {tournament.is_custom && (
              <Button
                size="sm"
                onClick={() => { setShowTeamForm((v) => !v); setEditingTeamId(null); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar equipo
              </Button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showTeamForm && tournament.is_custom && (
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
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Nuevo equipo</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Nombre</Label>
                      <Input
                        placeholder="México"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm((p) => ({ ...p, name: e.target.value }))}
                        className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Abreviatura</Label>
                      <Input
                        placeholder="MEX"
                        value={teamForm.short_name}
                        onChange={(e) => setTeamForm((p) => ({ ...p, short_name: e.target.value }))}
                        className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">
                      URL de imagen / bandera <span className="text-slate-600">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="https://ejemplo.com/bandera.png"
                      value={teamForm.logo_url}
                      onChange={(e) => setTeamForm((p) => ({ ...p, logo_url: e.target.value }))}
                      className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowTeamForm(false)} className="text-slate-400 hover:text-white text-xs">
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {teams.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-slate-800">
              <Trophy className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {tournament.is_custom ? 'Aún no hay equipos. Agrega el primero.' : 'Sin equipos registrados en este torneo.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <div key={team.id} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  {(tournament.is_custom || user?.is_admin) && editingTeamId === team.id ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">Nombre</Label>
                          <Input value={editTeamForm.name} onChange={(e) => setEditTeamForm((p) => ({ ...p, name: e.target.value }))} className="bg-slate-950 border-slate-700 text-white text-sm h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">Abreviatura</Label>
                          <Input value={editTeamForm.short_name} onChange={(e) => setEditTeamForm((p) => ({ ...p, short_name: e.target.value }))} className="bg-slate-950 border-slate-700 text-white text-sm h-8" maxLength={10} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-xs">URL de imagen</Label>
                        <Input value={editTeamForm.logo_url} onChange={(e) => setEditTeamForm((p) => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm h-8" />
                      </div>
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditingTeamId(null)} className="p-1.5 rounded text-slate-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleUpdateTeam(team.id)} disabled={saving} className="p-1.5 rounded text-emerald-400 hover:text-emerald-300 transition-colors">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <TeamAvatar team={team} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{team.name}</p>
                        <p className="text-xs text-slate-500">{team.short_name}</p>
                      </div>
                      {(tournament.is_custom || user?.is_admin) && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => startEditTeam(team)} className="p-1.5 rounded text-slate-500 hover:text-white transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                          {tournament.is_custom && (
                            <button onClick={() => handleRemoveTeam(team.id)} className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ════════════════════ CALENDARIO ════════════════════ */}
        <TabsContent value="calendar" className="mt-4">
          {!tournament.is_custom && user?.is_admin && (
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="border-slate-600 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
              >
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar API
              </Button>
            </div>
          )}

          {rounds.length === 0 ? (
            /* ── Empty state ── */
            <div className="text-center py-14 rounded-xl border border-dashed border-slate-700">
              <CalendarDays className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Sin jornadas</p>
              <p className="text-slate-600 text-xs mt-1">Agrega la primera jornada para comenzar a cargar partidos.</p>
            </div>
          ) : (
            /* ── Accordion ── */
            <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
              {rounds.map((round) => {
                const isExpanded = expandedRoundId === round.id;
                const isLoading = loadingRoundId === round.id;
                const roundMatches = matchesByRound[round.id] ?? [];

                return (
                  <div key={round.id}>
                    {/* ── Round header ── */}
                    <div
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 transition-colors',
                        isExpanded ? 'bg-slate-800/60' : 'bg-slate-900 hover:bg-slate-800/30'
                      )}
                    >
                      {/* Expand toggle */}
                      <button
                        onClick={() => handleExpandRound(round.id)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200',
                            isExpanded && 'rotate-90'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-semibold truncate',
                            isExpanded ? 'text-white' : 'text-slate-300'
                          )}
                        >
                          {round.name}
                        </span>

                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 text-slate-600 animate-spin shrink-0" />
                        ) : round.matches_count > 0 ? (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums',
                              isExpanded
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 text-slate-500'
                            )}
                          >
                            {round.matches_count}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-700 shrink-0">vacía</span>
                        )}
                      </button>

                      {/* Delete round */}
                      {tournament.is_custom && (
                        <button
                          onClick={() => handleRemoveRound(round.id)}
                          className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                          title="Eliminar jornada"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* ── Expanded content ── */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key={`content-${round.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="bg-slate-950/40 border-t border-slate-800/60">
                            {/* Match list */}
                            {isLoading ? (
                              <div className="px-4 py-4 space-y-2">
                                {[0, 1, 2].map((i) => (
                                  <Skeleton key={i} className="h-12 bg-slate-800 rounded-lg" />
                                ))}
                              </div>
                            ) : roundMatches.length === 0 && !showMatchForm ? (
                              <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
                                <p className="text-slate-600 text-sm">Sin partidos en esta jornada.</p>
                                {tournament.is_custom && teams.length >= 2 && (
                                  <button
                                    onClick={() => setShowMatchForm(true)}
                                    className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Agregar primer partido
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-800/50">
                                {roundMatches.map((match) => {
                                  const hasStarted = new Date(match.scheduled_at) <= new Date();
                                  return (
                                  <div key={match.id}>
                                    {editingMatchId === match.id ? (
                                      /* ── Edit match inline ── */
                                      <div className="px-4 py-4 space-y-3 bg-slate-900/60">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Editar partido</p>
                                        {(tournament.is_custom || user?.is_admin) && (
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <Label className="text-slate-400 text-xs">Local</Label>
                                              <TeamSelect value={editMatchForm.home_team_id} onChange={(v) => setEditMatchForm((p) => ({ ...p, home_team_id: v }))} teams={teams} excludeId={Number(editMatchForm.away_team_id)} />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-slate-400 text-xs">Visitante</Label>
                                              <TeamSelect value={editMatchForm.away_team_id} onChange={(v) => setEditMatchForm((p) => ({ ...p, away_team_id: v }))} teams={teams} excludeId={Number(editMatchForm.home_team_id)} />
                                            </div>
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <Label className="text-slate-400 text-xs">Fecha y hora</Label>
                                            <Input type="datetime-local" value={editMatchForm.scheduled_at} onChange={(e) => setEditMatchForm((p) => ({ ...p, scheduled_at: e.target.value }))} className="bg-slate-950 border-slate-700 text-white text-sm" />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-slate-400 text-xs">Sede</Label>
                                            <Input placeholder="Estadio..." value={editMatchForm.venue} onChange={(e) => setEditMatchForm((p) => ({ ...p, venue: e.target.value }))} className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm" />
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-1">
                                          <button type="button" onClick={() => setEditingMatchId(null)} className="p-1.5 rounded text-slate-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
                                          <button type="button" onClick={() => handleUpdateMatch(match.id)} disabled={saving} className="p-1.5 rounded text-emerald-400 hover:text-emerald-300 transition-colors">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                          </button>
                                        </div>
                                      </div>
                                    ) : resultMatchId === match.id ? (
                                      /* ── Result entry inline ── */
                                      <div className="px-4 py-4 space-y-3 bg-slate-900/60">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                          {match.result ? 'Editar resultado' : 'Ingresar resultado'}
                                        </p>
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm text-white font-medium flex-1 text-right truncate">
                                            {match.home_team?.name ?? match.home_placeholder ?? 'Local'}
                                          </span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <Input
                                              type="number"
                                              min={0}
                                              value={resultForm.home_score}
                                              onChange={(e) => setResultForm((p) => ({ ...p, home_score: e.target.value }))}
                                              className="w-14 text-center bg-slate-950 border-slate-700 text-white text-sm h-9"
                                            />
                                            <span className="text-slate-500 font-bold">-</span>
                                            <Input
                                              type="number"
                                              min={0}
                                              value={resultForm.away_score}
                                              onChange={(e) => setResultForm((p) => ({ ...p, away_score: e.target.value }))}
                                              className="w-14 text-center bg-slate-950 border-slate-700 text-white text-sm h-9"
                                            />
                                          </div>
                                          <span className="text-sm text-white font-medium flex-1 truncate">
                                            {match.away_team?.name ?? match.away_placeholder ?? 'Visitante'}
                                          </span>
                                        </div>
                                        <div className="flex justify-end gap-1">
                                          <button type="button" onClick={() => setResultMatchId(null)} className="p-1.5 rounded text-slate-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
                                          <button
                                            type="button"
                                            onClick={() => handleSetResult(match)}
                                            disabled={savingResult || resultForm.home_score === '' || resultForm.away_score === ''}
                                            className="p-1.5 rounded text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-40"
                                          >
                                            {savingResult ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* ── Match row ── */
                                      <div className="flex items-center gap-3 px-4 py-3 group">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <MatchTeamFlag teamId={match.home_team?.id} teams={teams} />
                                            <span className="text-sm font-medium text-white truncate">
                                              {match.home_team?.name ?? <span className="text-slate-500 italic text-xs">{match.home_placeholder ?? 'Por definir'}</span>}
                                            </span>
                                            {match.result ? (
                                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0 tabular-nums">
                                                {match.result.home_score} – {match.result.away_score}
                                              </span>
                                            ) : (
                                              <span className="text-slate-600 text-xs shrink-0 font-medium">vs</span>
                                            )}
                                            <span className="text-sm font-medium text-white truncate">
                                              {match.away_team?.name ?? <span className="text-slate-500 italic text-xs">{match.away_placeholder ?? 'Por definir'}</span>}
                                            </span>
                                            <MatchTeamFlag teamId={match.away_team?.id} teams={teams} />
                                          </div>
                                          <p className="text-xs text-slate-500 mt-0.5">
                                            {new Date(match.scheduled_at).toLocaleString('es-MX', {
                                              timeZone: 'America/Mexico_City',
                                              weekday: 'short', day: 'numeric', month: 'short',
                                              hour: '2-digit', minute: '2-digit',
                                            })}
                                            {match.venue && <> · <span className="text-slate-600">{match.venue}</span></>}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          {hasStarted && (tournament.is_custom || user?.is_admin) && (
                                            <button
                                              onClick={() => startSetResult(match)}
                                              className={cn(
                                                'p-1.5 rounded transition-colors',
                                                match.result
                                                  ? 'text-slate-500 hover:text-emerald-400'
                                                  : 'text-amber-500 hover:text-amber-400 md:opacity-0 md:group-hover:opacity-100'
                                              )}
                                              title={match.result ? 'Editar resultado' : 'Ingresar resultado'}
                                            >
                                              <Trophy className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          {(tournament.is_custom || user?.is_admin) && (
                                            <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => startEditMatch(match)} className="p-1.5 rounded text-slate-500 hover:text-white transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                                              {tournament.is_custom && (
                                                <button onClick={() => handleRemoveMatch(match.id)} className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* ── Add match form ── */}
                            <AnimatePresence initial={false}>
                              {showMatchForm && tournament.is_custom && (
                                <motion.form
                                  key="match-form"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  onSubmit={handleAddMatch}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 pt-3 space-y-3 border-t border-slate-800/60 bg-slate-900/40">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nuevo partido</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-slate-400 text-xs">Local</Label>
                                        <TeamSelect value={matchForm.home_team_id} onChange={(v) => setMatchForm((p) => ({ ...p, home_team_id: v }))} teams={teams} excludeId={Number(matchForm.away_team_id)} />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-slate-400 text-xs">Visitante</Label>
                                        <TeamSelect value={matchForm.away_team_id} onChange={(v) => setMatchForm((p) => ({ ...p, away_team_id: v }))} teams={teams} excludeId={Number(matchForm.home_team_id)} />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-slate-400 text-xs">Fecha y hora</Label>
                                        <Input type="datetime-local" value={matchForm.scheduled_at} onChange={(e) => setMatchForm((p) => ({ ...p, scheduled_at: e.target.value }))} className="bg-slate-950 border-slate-700 text-white text-sm" required />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-slate-400 text-xs">Sede <span className="text-slate-600">(opcional)</span></Label>
                                        <Input placeholder="Estadio..." value={matchForm.venue} onChange={(e) => setMatchForm((p) => ({ ...p, venue: e.target.value }))} className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm" />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowMatchForm(false)} className="text-slate-400 hover:text-white text-xs">Cancelar</Button>
                                      <Button type="submit" size="sm" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
                                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                                        Guardar partido
                                      </Button>
                                    </div>
                                  </div>
                                </motion.form>
                              )}
                            </AnimatePresence>

                            {/* ── Add match trigger ── */}
                            {tournament.is_custom && teams.length >= 2 && !showMatchForm && roundMatches.length > 0 && (
                              <div className="px-4 py-2.5 border-t border-slate-800/40">
                                <button
                                  onClick={() => { setShowMatchForm(true); setEditingMatchId(null); }}
                                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Agregar partido
                                </button>
                              </div>
                            )}

                            {tournament.is_custom && teams.length < 2 && (
                              <div className="px-4 py-3 border-t border-slate-800/40">
                                <p className="text-xs text-amber-500/80 text-center">
                                  Necesitas al menos 2 equipos para agregar partidos.
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Add round — persistent input at bottom ── */}
          {tournament.is_custom && (
            <form onSubmit={handleAddRound} className="mt-3 flex gap-2">
              <Input
                ref={roundInputRef}
                placeholder="Nueva jornada... (ej: Grupo A, Semifinal)"
                value={roundNameInput}
                onChange={(e) => setRoundNameInput(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-sm h-9 focus:border-emerald-500/60"
              />
              <Button
                type="submit"
                size="sm"
                disabled={saving || !roundNameInput.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white h-9 px-3 shrink-0"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </form>
          )}
        </TabsContent>
        {/* ════════════════════ CONFIGURACIÓN ════════════════════ */}
        {tournament.is_custom && (
          <TabsContent value="config" className="mt-4 space-y-5">
            {/* Name */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Nombre del torneo</p>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Nombre</Label>
                <Input
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="Mi torneo"
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm"
                />
              </div>
            </div>

            {/* Logo */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Logo del torneo</p>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">URL de imagen</Label>
                <Input
                  value={configLogo}
                  onChange={(e) => setConfigLogo(e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-sm"
                />
              </div>
              {configLogo ? (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={configLogo}
                    alt="preview"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    className="h-12 w-12 rounded-lg object-cover border border-slate-700 bg-slate-800"
                  />
                  <p className="text-xs text-slate-500">Vista previa del logo</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-700 px-3 py-4 justify-center">
                  <ImageIcon className="h-4 w-4 text-slate-600" />
                  <p className="text-xs text-slate-600">Sin logo configurado</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveConfig}
                disabled={savingConfig || !configName.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
              >
                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar cambios
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
}

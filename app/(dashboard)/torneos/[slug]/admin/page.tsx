'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
  Calendar, MapPin, ChevronUp, ChevronDown, Play, Square,
} from 'lucide-react';
import { FlagPlaceholder } from '@/components/ui/flag-placeholder';
import { cn, formatMatchDateParts } from '@/lib/utils';
import { toLocalDateKey, formatDateLabel, todayKey } from '@/lib/date-utils';

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


const CARD_BG =
  'https://res.cloudinary.com/dr0klvutj/image/upload/v1781001150/MatchPick/file_00000000042c71fb8d0d570a11881d55.png';

const ADMIN_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programado', in_progress: 'Jugando', finished: 'Finalizado', cancelled: 'Cancelado',
};

const ADMIN_STATUS_COLORS: Record<string, { dot: string; icon: string; badge: string; line: string }> = {
  scheduled:   { dot: 'bg-emerald-400', icon: 'text-emerald-400', badge: 'border-emerald-600/40 text-emerald-400', line: 'bg-emerald-400/60' },
  in_progress: { dot: 'bg-red-400',     icon: 'text-red-400',     badge: 'border-red-500/60 text-red-400',         line: 'bg-red-400/60'     },
  finished:    { dot: 'bg-slate-500',   icon: 'text-slate-500',   badge: 'border-slate-600 text-slate-500',         line: 'bg-slate-600/60'   },
  cancelled:   { dot: 'bg-slate-500',   icon: 'text-slate-500',   badge: 'border-slate-600 text-slate-500',         line: 'bg-slate-600/60'   },
};

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
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // Calendar date-strip state
  const [activeTab, setActiveTab] = useState('calendar');
  const [adminDateKey, setAdminDateKey] = useState('');
  const adminDateRef = useRef<HTMLButtonElement | null>(null);
  const [calendarLoaded, setCalendarLoaded] = useState(false);

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

  // ── Calendar: load all rounds as soon as rounds data is available ────────

  useEffect(() => {
    if (calendarLoaded || rounds.length === 0 || !slug) return;
    setCalendarLoaded(true);
    Promise.all(
      rounds
        .filter((r) => matchesByRound[r.id] === undefined)
        .map((r) =>
          api.get<ApiResponse<CustomMatch[]>>(`/tournaments/${slug}/rounds/${r.id}/matches`)
            .then((res) => ({ roundId: r.id, matches: res.data }))
            .catch(() => ({ roundId: r.id, matches: [] as CustomMatch[] }))
        )
    ).then((results) => {
      setMatchesByRound((prev) => {
        const next = { ...prev };
        results.forEach(({ roundId, matches }) => { next[roundId] = matches; });
        return next;
      });
    });
  }, [calendarLoaded, rounds, slug]);

  // Tag each match with its round info and build date groups
  type AdminMatch = CustomMatch & { roundId: number; roundName: string };

  const adminDateGroups = useMemo(() => {
    const byDate = new Map<string, AdminMatch[]>();
    for (const round of rounds) {
      for (const m of (matchesByRound[round.id] ?? [])) {
        const key = m.scheduled_at ? toLocalDateKey(m.scheduled_at) : 'sin-fecha';
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push({ ...m, roundId: round.id, roundName: round.name });
      }
    }
    return new Map([...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [rounds, matchesByRound]);

  const adminSortedDateKeys = useMemo(() => [...adminDateGroups.keys()], [adminDateGroups]);

  // Init active date to today or nearest upcoming day, falling back to the last date
  useEffect(() => {
    if (adminSortedDateKeys.length === 0) return;
    setAdminDateKey((prev) => {
      if (prev && adminDateGroups.has(prev)) return prev;
      const today = todayKey();
      const upcoming = adminSortedDateKeys.find((k) => k >= today);
      return upcoming ?? adminSortedDateKeys[adminSortedDateKeys.length - 1];
    });
  }, [adminSortedDateKeys]);

  // Scroll active date pill into view
  useEffect(() => {
    adminDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [adminDateKey]);

  // Matches for active date, grouped by round
  const adminActiveDateMatches = useMemo(() => {
    const matches = adminDateGroups.get(adminDateKey) ?? [];
    const byRound = new Map<string, AdminMatch[]>();
    for (const m of matches) {
      if (!byRound.has(m.roundName)) byRound.set(m.roundName, []);
      byRound.get(m.roundName)!.push(m);
    }
    return [...byRound.entries()];
  }, [adminDateKey, adminDateGroups]);

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

  const handleUpdateMatch = async (matchId: number, roundId: number) => {
    setSaving(true);
    try {
      const isCustom = tournament!.is_custom;
      const isAdmin  = !!user?.is_admin;
      const endpoint = isCustom
        ? `/tournaments/${slug}/rounds/${roundId}/matches/${matchId}`
        : `/admin/matches/${matchId}`;
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
        [roundId]: (prev[roundId] ?? []).map((m) =>
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

  const handleRemoveMatch = async (matchId: number, roundId: number) => {
    try {
      await api.delete(
        `/tournaments/${slug}/rounds/${roundId}/matches/${matchId}`
      );
      setMatchesByRound((prev) => ({
        ...prev,
        [roundId]: (prev[roundId] ?? []).filter((m) => m.id !== matchId),
      }));
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
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

  const handleSetResult = async (match: AdminMatch) => {
    setSavingResult(true);
    try {
      const endpoint = tournament!.is_custom
        ? `/tournaments/${slug}/rounds/${match.roundId}/matches/${match.id}/result`
        : `/admin/matches/${match.id}/results`;
      const res = await api.post<ApiResponse<MatchResult>>(endpoint, {
        home_score: Number(resultForm.home_score),
        away_score: Number(resultForm.away_score),
      });
      setMatchesByRound((prev) => ({
        ...prev,
        [match.roundId]: (prev[match.roundId] ?? []).map((m) =>
          m.id === match.id ? { ...m, result: res.data, status: m.status === 'in_progress' ? 'in_progress' : 'finished' } : m
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

  const handleUpdateStatus = async (match: CustomMatch, status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled', roundId: number) => {
    setUpdatingStatusId(match.id);
    try {
      const endpoint = tournament!.is_custom
        ? `/tournaments/${slug}/rounds/${roundId}/matches/${match.id}/status`
        : `/admin/matches/${match.id}/status`;
      await api.patch(endpoint, { status });
      setMatchesByRound((prev) => ({
        ...prev,
        [roundId]: (prev[roundId] ?? []).map((m) =>
          m.id === match.id ? { ...m, status } : m
        ),
      }));
      toast.success(status === 'in_progress' ? 'Partido iniciado.' : 'Partido finalizado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setUpdatingStatusId(null);
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
        <TabsContent value="calendar" className="mt-4 space-y-4">

          {/* Sync button */}
          {!tournament.is_custom && user?.is_admin && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}
                className="border-slate-600 text-slate-300 hover:text-white text-xs h-8 gap-1.5">
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar API
              </Button>
            </div>
          )}

          {/* Loading skeleton */}
          {!calendarLoaded ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 bg-slate-800 rounded-xl" />)}
            </div>
          ) : adminSortedDateKeys.length === 0 ? (
            <div className="text-center py-14 rounded-xl border border-dashed border-slate-700">
              <CalendarDays className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Sin partidos en el calendario</p>
            </div>
          ) : (
            <>
              {/* Date strip */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {adminSortedDateKeys.map((dateKey) => {
                  const { weekday, day, month } = formatDateLabel(dateKey);
                  const isActiveDate = adminDateKey === dateKey;
                  const isToday = dateKey === todayKey();
                  const count = adminDateGroups.get(dateKey)!.length;
                  return (
                    <button
                      key={dateKey}
                      ref={isActiveDate ? adminDateRef : undefined}
                      onClick={() => setAdminDateKey(dateKey)}
                      className={cn(
                        'shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border text-center min-w-[3.875rem] transition-all',
                        isActiveDate
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : isToday
                          ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-wide leading-none mb-1 font-semibold">
                        {isToday ? 'Hoy' : weekday}
                      </span>
                      <span className="text-xl font-bold leading-none">{day}</span>
                      <span className="text-[10px] uppercase tracking-wide leading-none mt-1">{month}</span>
                      <span className={cn('text-[9px] font-semibold mt-2 leading-none tabular-nums',
                        isActiveDate ? 'text-emerald-300/70' : 'text-slate-600')}>
                        {count} {count === 1 ? 'ptdo' : 'ptdos'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Match list for selected date */}
              <AnimatePresence mode="wait">
                <motion.div key={adminDateKey}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                  className="space-y-5">
                  {adminActiveDateMatches.map(([roundName, matches]) => (
                    <div key={roundName} className="space-y-2">
                      {/* Round label */}
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-0.5">{roundName}</p>

                      {/* Cards grid */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {matches.map((match) => {
                          const hasStarted = new Date(match.scheduled_at) <= new Date();
                          const isEditingResult = resultMatchId === match.id;
                          const isEditingMatch = editingMatchId === match.id;
                          const { date, time } = formatMatchDateParts(match.scheduled_at);
                          const sc = ADMIN_STATUS_COLORS[match.status] ?? ADMIN_STATUS_COLORS.scheduled;

                          return (
                            <div
                              key={match.id}
                              className={cn(
                                'relative rounded-xl overflow-hidden border transition-all duration-200',
                                match.status === 'in_progress'
                                  ? 'border-red-500/40'
                                  : match.status === 'finished'
                                  ? 'border-slate-800'
                                  : 'border-slate-700/60',
                              )}
                            >
                              {/* Background */}
                              <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${CARD_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                              <div className="absolute inset-0 z-0 bg-slate-950/82" />

                              {/* ── Card body ── */}
                              <div className="relative z-10">

                                {/* Date + status */}
                                <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-400">
                                    <Calendar className={cn('h-3.5 w-3.5 shrink-0', sc.icon)} />
                                    <span className="font-medium">{date}</span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-slate-500">{time}</span>
                                  </div>
                                  <Badge variant="outline" className={cn('flex items-center gap-1 text-xs', sc.badge)}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot, match.status === 'in_progress' && 'animate-pulse')} />
                                    {ADMIN_STATUS_LABELS[match.status] ?? match.status}
                                  </Badge>
                                </div>

                                {/* Teams + score/steppers */}
                                <div className="flex items-center gap-2 px-3 py-2">
                                  {/* Home */}
                                  <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                    {match.home_team?.logo_url ? (
                                      <img src={match.home_team.logo_url} alt="" className="w-10 h-7 object-cover rounded shadow-md" />
                                    ) : (
                                      <FlagPlaceholder size="md" />
                                    )}
                                    <span className="w-full text-[11px] font-semibold text-white text-center leading-tight truncate px-1 mt-0.5">
                                      {match.home_team?.name ?? match.home_placeholder ?? 'Local'}
                                    </span>
                                    <div className={cn('h-0.5 w-6 rounded-full', sc.line)} />
                                  </div>

                                  {/* Score / Steppers */}
                                  <div className="shrink-0 flex items-center justify-center">
                                    {isEditingResult ? (
                                      <div className="flex items-center gap-1.5">
                                        {/* Home stepper */}
                                        <div className="flex flex-col items-center select-none">
                                          <button type="button"
                                            onClick={() => setResultForm((p) => ({ ...p, home_score: String(Math.min(99, Number(p.home_score || 0) + 1)) }))}
                                            className="w-8 h-6 flex items-center justify-center bg-black/40 hover:bg-slate-700/80 border border-b-0 border-slate-700 rounded-t text-slate-400 hover:text-emerald-400 transition-colors">
                                            <ChevronUp className="h-3 w-3" />
                                          </button>
                                          <div className="w-8 h-8 flex items-center justify-center border border-slate-700 bg-black/50 text-base font-bold text-white tabular-nums font-mono">
                                            {resultForm.home_score !== '' ? resultForm.home_score : '—'}
                                          </div>
                                          <button type="button"
                                            onClick={() => setResultForm((p) => ({ ...p, home_score: String(Math.max(0, Number(p.home_score || 0) - 1)) }))}
                                            disabled={resultForm.home_score === '0' || resultForm.home_score === ''}
                                            className="w-8 h-6 flex items-center justify-center bg-black/40 hover:bg-slate-700/80 border border-t-0 border-slate-700 rounded-b text-slate-400 hover:text-red-400 disabled:opacity-25 transition-colors">
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <span className="text-slate-500 font-bold">–</span>
                                        {/* Away stepper */}
                                        <div className="flex flex-col items-center select-none">
                                          <button type="button"
                                            onClick={() => setResultForm((p) => ({ ...p, away_score: String(Math.min(99, Number(p.away_score || 0) + 1)) }))}
                                            className="w-8 h-6 flex items-center justify-center bg-black/40 hover:bg-slate-700/80 border border-b-0 border-slate-700 rounded-t text-slate-400 hover:text-emerald-400 transition-colors">
                                            <ChevronUp className="h-3 w-3" />
                                          </button>
                                          <div className="w-8 h-8 flex items-center justify-center border border-slate-700 bg-black/50 text-base font-bold text-white tabular-nums font-mono">
                                            {resultForm.away_score !== '' ? resultForm.away_score : '—'}
                                          </div>
                                          <button type="button"
                                            onClick={() => setResultForm((p) => ({ ...p, away_score: String(Math.max(0, Number(p.away_score || 0) - 1)) }))}
                                            disabled={resultForm.away_score === '0' || resultForm.away_score === ''}
                                            className="w-8 h-6 flex items-center justify-center bg-black/40 hover:bg-slate-700/80 border border-t-0 border-slate-700 rounded-b text-slate-400 hover:text-red-400 disabled:opacity-25 transition-colors">
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : match.result ? (
                                      <span className="text-xl font-bold text-white font-mono tabular-nums px-2">
                                        {match.result.home_score} – {match.result.away_score}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-black tracking-widest text-white/80 bg-white/10 border border-white/20 rounded px-2 py-0.5 backdrop-blur-sm">
                                        VS
                                      </span>
                                    )}
                                  </div>

                                  {/* Away */}
                                  <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                    {match.away_team?.logo_url ? (
                                      <img src={match.away_team.logo_url} alt="" className="w-10 h-7 object-cover rounded shadow-md" />
                                    ) : (
                                      <FlagPlaceholder size="md" />
                                    )}
                                    <span className="w-full text-[11px] font-semibold text-white text-center leading-tight truncate px-1 mt-0.5">
                                      {match.away_team?.name ?? match.away_placeholder ?? 'Visitante'}
                                    </span>
                                    <div className={cn('h-0.5 w-6 rounded-full', sc.line)} />
                                  </div>
                                </div>

                                {/* Venue */}
                                {match.venue && (
                                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pb-2 px-3">
                                    <MapPin className={cn('h-3 w-3 shrink-0', sc.icon)} />
                                    <span className="truncate">{match.venue}</span>
                                  </div>
                                )}
                              </div>

                              {/* ── Edit match form (expands below card) ── */}
                              <AnimatePresence initial={false}>
                                {isEditingMatch && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                                    className="relative z-10 overflow-hidden"
                                  >
                                    <div className="border-t border-slate-800/70 bg-slate-900/90 px-3 py-3 space-y-2.5">
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
                                          <Label className="text-slate-400 text-xs">Fecha y hora <span className="text-slate-600">(MX)</span></Label>
                                          <Input type="datetime-local" value={editMatchForm.scheduled_at} onChange={(e) => setEditMatchForm((p) => ({ ...p, scheduled_at: e.target.value }))} className="bg-slate-950 border-slate-700 text-white text-xs h-8" />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-slate-400 text-xs">Sede</Label>
                                          <Input placeholder="Estadio..." value={editMatchForm.venue} onChange={(e) => setEditMatchForm((p) => ({ ...p, venue: e.target.value }))} className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-xs h-8" />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setEditingMatchId(null)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors">
                                          <X className="h-3.5 w-3.5" />Cancelar
                                        </button>
                                        <button type="button" onClick={() => handleUpdateMatch(match.id, match.roundId)} disabled={saving}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 transition-colors">
                                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                          Guardar
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* ── Action bar ── */}
                              <div className="relative z-10 flex items-center gap-1 px-2 py-2 border-t border-slate-800/50 bg-black/25">
                                {isEditingResult ? (
                                  <>
                                    <button type="button" onClick={() => setResultMatchId(null)}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors">
                                      <X className="h-3.5 w-3.5" />Cancelar
                                    </button>
                                    <button type="button" onClick={() => handleSetResult(match)}
                                      disabled={savingResult || resultForm.home_score === '' || resultForm.away_score === ''}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 transition-colors">
                                      {savingResult ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                      Guardar resultado
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {/* Left: status controls */}
                                    <div className="flex items-center gap-1 flex-1">
                                      {(user?.is_admin || tournament.is_custom) && match.status === 'scheduled' && hasStarted && (
                                        <button onClick={() => handleUpdateStatus(match, 'in_progress', match.roundId)}
                                          disabled={updatingStatusId === match.id}
                                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors">
                                          {updatingStatusId === match.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                                          Iniciar
                                        </button>
                                      )}
                                      {(user?.is_admin || tournament.is_custom) && match.status === 'in_progress' && (
                                        <button onClick={() => handleUpdateStatus(match, 'finished', match.roundId)}
                                          disabled={updatingStatusId === match.id}
                                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-300 border border-slate-600/50 hover:bg-slate-700/30 disabled:opacity-50 transition-colors">
                                          {updatingStatusId === match.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3 fill-current" />}
                                          Finalizar
                                        </button>
                                      )}
                                    </div>
                                    {/* Right: edit actions */}
                                    <div className="flex items-center gap-0.5">
                                      {hasStarted && (tournament.is_custom || user?.is_admin) && (
                                        <button onClick={() => startSetResult(match)}
                                          className={cn('p-1.5 rounded transition-colors', match.result ? 'text-emerald-500/60 hover:text-emerald-400' : 'text-amber-500 hover:text-amber-400')}
                                          title={match.result ? 'Editar resultado' : 'Ingresar resultado'}>
                                          <Trophy className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {(tournament.is_custom || user?.is_admin) && (
                                        <button onClick={() => { if (isEditingMatch) setEditingMatchId(null); else startEditMatch(match); }}
                                          className={cn('p-1.5 rounded transition-colors', isEditingMatch ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white')}
                                          title="Editar partido">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {tournament.is_custom && (
                                        <button onClick={() => handleRemoveMatch(match.id, match.roundId)}
                                          className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors" title="Eliminar">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          {/* Custom: Gestionar jornadas (collapsed section) */}
          {tournament.is_custom && calendarLoaded && (
            <div className="pt-2 border-t border-slate-800/60 space-y-3">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Gestionar jornadas</p>
              <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
                {rounds.map((round) => {
                  const isExpanded = expandedRoundId === round.id;
                  const isLoading = loadingRoundId === round.id;
                  const roundMatches = matchesByRound[round.id] ?? [];
                  return (
                    <div key={round.id}>
                      <div className={cn('flex items-center gap-3 px-4 py-3 transition-colors',
                        isExpanded ? 'bg-slate-800/60' : 'bg-slate-900 hover:bg-slate-800/30')}>
                        <button onClick={() => handleExpandRound(round.id)}
                          className="flex-1 flex items-center gap-2.5 text-left min-w-0">
                          <ChevronRight className={cn('h-3.5 w-3.5 text-slate-500 shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                          <span className={cn('text-xs font-semibold truncate', isExpanded ? 'text-white' : 'text-slate-400')}>{round.name}</span>
                          {isLoading ? <Loader2 className="h-3 w-3 text-slate-600 animate-spin shrink-0" />
                            : <span className="text-[10px] text-slate-600 shrink-0">{round.matches_count} partidos</span>}
                        </button>
                        <button onClick={() => handleRemoveRound(round.id)}
                          className="p-1.5 rounded text-slate-700 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                            <div className="bg-slate-950/40 border-t border-slate-800/60 divide-y divide-slate-800/50">
                              {roundMatches.map((match) => (
                                <div key={match.id} className="flex items-center justify-between px-4 py-2.5 group">
                                  <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
                                    {match.home_team?.name ?? match.home_placeholder ?? '?'} vs {match.away_team?.name ?? match.away_placeholder ?? '?'}
                                  </span>
                                  <button onClick={() => handleRemoveMatch(match.id, round.id)}
                                    className="p-1 rounded text-slate-700 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              {teams.length >= 2 && (
                                showMatchForm && expandedRoundId === round.id ? (
                                  <form onSubmit={handleAddMatch} className="px-4 py-3 space-y-2.5 bg-slate-900/40">
                                    <div className="grid grid-cols-2 gap-2">
                                      <TeamSelect value={matchForm.home_team_id} onChange={(v) => setMatchForm((p) => ({ ...p, home_team_id: v }))} teams={teams} excludeId={Number(matchForm.away_team_id)} />
                                      <TeamSelect value={matchForm.away_team_id} onChange={(v) => setMatchForm((p) => ({ ...p, away_team_id: v }))} teams={teams} excludeId={Number(matchForm.home_team_id)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input type="datetime-local" value={matchForm.scheduled_at} onChange={(e) => setMatchForm((p) => ({ ...p, scheduled_at: e.target.value }))} className="bg-slate-950 border-slate-700 text-white text-xs h-8" required />
                                      <Input placeholder="Estadio..." value={matchForm.venue} onChange={(e) => setMatchForm((p) => ({ ...p, venue: e.target.value }))} className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 text-xs h-8" />
                                    </div>
                                    <div className="flex justify-end gap-1">
                                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowMatchForm(false)} className="h-7 text-xs text-slate-400">Cancelar</Button>
                                      <Button type="submit" size="sm" disabled={saving} className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white">
                                        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}Guardar
                                      </Button>
                                    </div>
                                  </form>
                                ) : (
                                  <button onClick={() => { setExpandedRoundId(round.id); setShowMatchForm(true); }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-600 hover:text-emerald-400 transition-colors">
                                    <Plus className="h-3.5 w-3.5" />Agregar partido
                                  </button>
                                )
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleAddRound} className="flex gap-2">
                <Input ref={roundInputRef} placeholder="Nueva jornada..." value={roundNameInput}
                  onChange={(e) => setRoundNameInput(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-sm h-9 focus:border-emerald-500/60" />
                <Button type="submit" size="sm" disabled={saving || !roundNameInput.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white h-9 px-3 shrink-0">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </form>
            </div>
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

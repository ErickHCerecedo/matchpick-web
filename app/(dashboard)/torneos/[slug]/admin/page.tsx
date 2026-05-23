'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { ApiResponse, Tournament, Round, CustomTeam, CustomMatch } from '@/types';
import { ArrowLeft, Plus, Trash2, Loader2, Users, CalendarDays, Trophy } from 'lucide-react';

export default function TorneoAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<CustomTeam[]>([]);
  const [rounds, setRounds] = useState<(Round & { matches_count: number })[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [matches, setMatches] = useState<CustomMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Forms
  const [teamForm, setTeamForm] = useState({ name: '', short_name: '' });
  const [roundForm, setRoundForm] = useState({ name: '' });
  const [matchForm, setMatchForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get<ApiResponse<Tournament>>(`/tournaments/${slug}`),
      api.get<ApiResponse<CustomTeam[]>>(`/tournaments/${slug}/teams`),
      api.get<ApiResponse<(Round & { matches_count: number })[]>>(`/tournaments/${slug}/rounds`),
    ]).then(([tRes, teRes, rRes]) => {
      setTournament(tRes.data);
      setTeams(teRes.data);
      setRounds(rRes.data);
      if (rRes.data.length > 0) setSelectedRoundId(rRes.data[0].id);
    }).catch(() => {
      toast.error('No tienes acceso a este panel.');
      router.push('/torneos');
    });
  }, [slug, router]);

  useEffect(() => {
    if (!selectedRoundId || !slug) return;
    setLoadingMatches(true);
    api.get<ApiResponse<CustomMatch[]>>(`/tournaments/${slug}/rounds/${selectedRoundId}/matches`)
      .then((res) => setMatches(res.data))
      .catch(console.error)
      .finally(() => setLoadingMatches(false));
  }, [selectedRoundId, slug]);

  // ── Teams ──────────────────────────────────────────────────────────────

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<CustomTeam>>(`/tournaments/${slug}/teams`, teamForm);
      setTeams((prev) => [...prev, res.data]);
      setTeamForm({ name: '', short_name: '' });
      toast.success('Equipo agregado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar equipo');
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

  // ── Rounds ─────────────────────────────────────────────────────────────

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<Round & { matches_count: number }>>(`/tournaments/${slug}/rounds`, roundForm);
      setRounds((prev) => [...prev, res.data]);
      setRoundForm({ name: '' });
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
      setRounds((prev) => prev.filter((r) => r.id !== roundId));
      if (selectedRoundId === roundId) {
        const remaining = rounds.filter((r) => r.id !== roundId);
        setSelectedRoundId(remaining[0]?.id ?? null);
      }
      toast.success('Jornada eliminada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar jornada');
    }
  };

  // ── Matches ────────────────────────────────────────────────────────────

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoundId) return;
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<CustomMatch>>(
        `/tournaments/${slug}/rounds/${selectedRoundId}/matches`,
        { ...matchForm, home_team_id: Number(matchForm.home_team_id), away_team_id: Number(matchForm.away_team_id) }
      );
      setMatches((prev) => [...prev, res.data]);
      setMatchForm({ home_team_id: '', away_team_id: '', scheduled_at: '', venue: '' });
      toast.success('Partido agregado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar partido');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMatch = async (matchId: number) => {
    if (!selectedRoundId) return;
    try {
      await api.delete(`/tournaments/${slug}/rounds/${selectedRoundId}/matches/${matchId}`);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      toast.success('Partido eliminado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar partido');
    }
  };

  if (!tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/torneos" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white truncate">{tournament.name}</h2>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs shrink-0">Admin</Badge>
          </div>
          <p className="text-slate-400 text-sm">{tournament.season}</p>
        </div>
        <Link href={`/torneos/${slug}`}>
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:text-white shrink-0">
            Ver torneo
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="teams">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="teams" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-2">
            <Users className="h-3.5 w-3.5" /> Equipos ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> Calendario
          </TabsTrigger>
        </TabsList>

        {/* ── EQUIPOS ─────────────────────────────────────────────────── */}
        <TabsContent value="teams" className="mt-4 space-y-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Agregar equipo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTeam} className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-40">
                  <Input
                    placeholder="Nombre del equipo"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm((p) => ({ ...p, name: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="w-28">
                  <Input
                    placeholder="Abrev."
                    value={teamForm.short_name}
                    onChange={(e) => setTeamForm((p) => ({ ...p, short_name: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    maxLength={10}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          {teams.length === 0 ? (
            <div className="text-center py-10">
              <Trophy className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aún no hay equipos. Agrega el primero.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{team.name}</p>
                    <p className="text-xs text-slate-500">{team.short_name}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── CALENDARIO ──────────────────────────────────────────────── */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Rounds sidebar */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-300">Jornadas</p>
              <div className="space-y-1.5">
                {rounds.map((round) => (
                  <div key={round.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedRoundId(round.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedRoundId === round.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="font-medium">{round.name}</span>
                      <span className="text-xs ml-1.5 opacity-60">({round.matches_count} partidos)</span>
                    </button>
                    <button
                      onClick={() => handleRemoveRound(round.id)}
                      className="p-1.5 rounded text-slate-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddRound} className="flex gap-1.5">
                <Input
                  placeholder="Nueva jornada"
                  value={roundForm.name}
                  onChange={(e) => setRoundForm({ name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm h-8"
                  required
                />
                <Button type="submit" size="sm" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-2">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>

            {/* Matches panel */}
            <div className="lg:col-span-2 space-y-3">
              {!selectedRoundId ? (
                <p className="text-slate-500 text-sm text-center py-10">Selecciona una jornada.</p>
              ) : (
                <>
                  {teams.length < 2 ? (
                    <p className="text-amber-500 text-sm text-center py-6">Necesitas al menos 2 equipos para agregar partidos.</p>
                  ) : (
                    <Card className="bg-slate-900 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">Agregar partido</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleAddMatch} className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Local</Label>
                              <select
                                value={matchForm.home_team_id}
                                onChange={(e) => setMatchForm((p) => ({ ...p, home_team_id: e.target.value }))}
                                className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                required
                              >
                                <option value="">Seleccionar</option>
                                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Visitante</Label>
                              <select
                                value={matchForm.away_team_id}
                                onChange={(e) => setMatchForm((p) => ({ ...p, away_team_id: e.target.value }))}
                                className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                required
                              >
                                <option value="">Seleccionar</option>
                                {teams.filter((t) => t.id !== Number(matchForm.home_team_id)).map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Fecha y hora</Label>
                              <Input
                                type="datetime-local"
                                value={matchForm.scheduled_at}
                                onChange={(e) => setMatchForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                                className="bg-slate-800 border-slate-600 text-white text-sm"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-slate-400 text-xs">Sede (opcional)</Label>
                              <Input
                                placeholder="Estadio..."
                                value={matchForm.venue}
                                onChange={(e) => setMatchForm((p) => ({ ...p, venue: e.target.value }))}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                              />
                            </div>
                          </div>
                          <Button type="submit" disabled={saving} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Agregar partido
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {loadingMatches ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                    </div>
                  ) : matches.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">Sin partidos en esta jornada.</p>
                  ) : (
                    <div className="space-y-2">
                      {matches.map((match) => (
                        <div key={match.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">
                              {match.home_team.name} <span className="text-slate-500">vs</span> {match.away_team.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(match.scheduled_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              {match.venue && <> · {match.venue}</>}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveMatch(match.id)}
                            className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

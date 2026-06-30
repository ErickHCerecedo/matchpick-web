export interface User {
  id: number;
  name: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  quinielas_created_count: number;
}

export interface AuthResponse {
  data: {
    token: string;
    user: User;
  };
}

export interface Country {
  id: number;
  name: string;
  iso_code: string;
  iso2_code: string;
  flag_url: string;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  logo_url: string | null;
  flag_url: string | null;
  country?: Country;
}

export interface Tournament {
  id: number;
  name: string;
  slug: string;
  type: 'world_cup' | 'league' | 'cup';
  season: string;
  logo_url: string | null;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_custom: boolean;
  creator?: { id: number; name: string } | null;
}

export interface Round {
  id: number;
  name: string;
  type: 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final' | 'general';
  order: number;
  tournament_id: number;
  matches_count?: number;
}

export interface CustomTeam {
  id: number;
  name: string;
  short_name: string;
  logo_url: string | null;
  external_id?: string | null;
}

export interface CustomMatch {
  id: number;
  scheduled_at: string;
  venue: string | null;
  status: string;
  external_id?: string | null;
  home_team: { id: number; name: string; short_name: string; logo_url?: string | null } | null;
  home_placeholder: string | null;
  away_team: { id: number; name: string; short_name: string; logo_url?: string | null } | null;
  away_placeholder: string | null;
  result: MatchResult | null;
}

export interface LiveMatch {
  id: number;
  scheduled_at: string;
  venue: string | null;
  status: 'in_progress';
  tournament: { id: number; name: string; slug: string; logo_url: string | null };
  round: { id: number; name: string };
  home_team: { id: number; name: string; short_name: string; flag_url: string | null } | null;
  home_placeholder: string | null;
  away_team: { id: number; name: string; short_name: string; flag_url: string | null } | null;
  away_placeholder: string | null;
  result: { home_score: number; away_score: number } | null;
}

export interface MatchResult {
  home_score: number;
  away_score: number;
  winner: 'home' | 'away' | 'draw';
}

export interface Prediction {
  id?: number;
  match_id: number;
  home_score: number;
  away_score: number;
  points?: number | null;
  user?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface Match {
  id: number;
  round: Round;
  home_team: Team | null;
  home_placeholder: string | null;
  away_team: Team | null;
  away_placeholder: string | null;
  scheduled_at: string;
  venue: string | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'postponed' | 'suspended' | 'paused' | 'rescheduled';
  prediction_closes_at: string;
  is_prediction_open: boolean;
  bracket_slot: number | null;
  my_prediction: Prediction | null;
  result: MatchResult | null;
}

export interface Quiniela {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  type: 'public' | 'private';
  tournament: Tournament;
  creator: Pick<User, 'id' | 'name' | 'avatar_url'>;
  participants_count: number;
  my_role: 'admin' | 'participant' | null;
  is_active: boolean;
  predictions_open: boolean;
  wildcard_enabled: boolean;
  penalties_enabled: boolean;
  my_standing?: { rank: number; total_points: number } | null;
  pending_predictions_count?: number;
}

export interface Standing {
  rank: number;
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
  total_points: number;
  exact_scores: number;
  correct_results: number;
  predictions_made: number;
}

export interface Invitation {
  token: string;
  quiniela: Quiniela;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface QuinielaDeleteStatus {
  can_delete_freely: boolean;
  reason: 'pre_tournament' | 'post_tournament' | 'active';
  votes_count: number;
  participants_count: number;
  my_vote: boolean;
  admin_voted: boolean;
  can_delete: boolean;
}

export interface RoundWithMatches {
  round: Pick<Round, 'id' | 'name' | 'type' | 'order'>;
  matches: Match[];
}

export interface BreakdownScore {
  points: number;
  breakdown: { result: 0 | 1; exact: 0 | 2 };
}

export interface BreakdownMatch {
  id: number;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled' | 'postponed' | 'suspended' | 'paused' | 'rescheduled';
  home_team: Pick<Team, 'id' | 'name' | 'short_name' | 'flag_url'> | null;
  away_team: Pick<Team, 'id' | 'name' | 'short_name' | 'flag_url'> | null;
  result: MatchResult | null;
  prediction: { home_score: number; away_score: number } | null;
  score: BreakdownScore | null;
  has_started: boolean;
}

export interface BreakdownRound {
  round: Pick<Round, 'id' | 'name' | 'type' | 'order'>;
  matches: BreakdownMatch[];
}

export interface ParticipantBreakdownData {
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
  standing: {
    total_points: number;
    exact_scores: number;
    correct_results: number;
    predictions_made: number;
  } | null;
  rounds: BreakdownRound[];
}

export interface TeamStandingRow {
  id: number;
  name: string;
  short_name: string;
  logo_url: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

export interface GroupStandings {
  name: string;
  teams: TeamStandingRow[];
}

export type TeamStandingsData =
  | { format: 'groups'; qualification_spots: number; groups: GroupStandings[] }
  | { format: 'table'; qualification_spots: number; teams: TeamStandingRow[] };

export interface WildcardTeam {
  id: number;
  name: string;
  short_name: string;
  flag_url: string | null;
}

/** WildcardTeam enriched with per-pick podium result once positions are confirmed. */
export interface WildcardPickResult extends WildcardTeam {
  points: number | null; // null=undetermined, 0=no pts, 3/6/9=earned
  place: 1 | 2 | 3 | null;
}

export interface ParticipantWildcard {
  user_id: number;
  user_name: string;
  picks: WildcardPickResult[];
  points_earned: number | null;
}

export interface WildcardData {
  is_open: boolean;
  deadline: string;
  eligible_teams: WildcardTeam[];
  picks: WildcardPickResult[];
  points_earned: number | null;
}

export interface WildcardPodium {
  first:  WildcardTeam | null;
  second: WildcardTeam | null;
  third:  WildcardTeam | null;
}

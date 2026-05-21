export interface User {
  id: number;
  name: string;
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
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface Round {
  id: number;
  name: string;
  type: 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final';
  order: number;
  tournament_id: number;
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
  away_team: Team | null;
  scheduled_at: string;
  venue: string | null;
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled';
  prediction_closes_at: string;
  is_prediction_open: boolean;
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

export interface RoundWithMatches {
  round: Pick<Round, 'id' | 'name' | 'type' | 'order'>;
  matches: Match[];
}

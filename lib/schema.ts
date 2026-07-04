export interface User {
  uid: string;
  email: string;
  name: string;
  avatar: string | null;
  group_id: string | null;
  total_score: number;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  total_score: number;
  member_count: number;
  created_at: string;
}

export interface QuizSession {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  started_at: string | null;
  ended_at: string | null;
}

export interface QuizScore {
  session_id: string;
  uid: string;
  score: number;
}

export interface DebateSession {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  topic_id: string | null;
  started_at: string | null;
  ended_at: string | null;
}

export interface DebateVote {
  session_id: string;
  voter_uid: string;
  voted_group: string;
}

export const MAX_GROUPS = 8;
export const MAX_MEMBERS_PER_GROUP = 7;

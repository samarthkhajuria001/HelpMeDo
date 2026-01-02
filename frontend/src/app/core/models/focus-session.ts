// Focus session types matching backend schemas

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface Pause {
  paused_at: string;
  resumed_at: string | null;
}

export interface FocusSession {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  planned_seconds: number;
  actual_seconds: number;
  status: SessionStatus;
  pause_count: number;
  total_pause_seconds: number;
  pauses: Pause[];
  metadata_: Record<string, unknown>;
  created_at: string;
}

// Request/Response types

export interface FocusSessionStart {
  task_id: string;
}

export interface FocusSessionActive {
  session: FocusSession | null;
}

export interface FocusSessionPauseResponse {
  session_id: string;
  pause_count: number;
  paused_at: string;
}

export interface FocusSessionResumeResponse {
  session_id: string;
  pause_count: number;
  total_pause_seconds: number;
}

export interface FocusSessionCompleteResponse {
  session_id: string;
  actual_seconds: number;
  task_actual_pomodoros: number;
}

export interface FocusSessionAbandonResponse {
  session_id: string;
  actual_seconds: number;
}

import { Priority, TimeHorizon } from './task';

export interface ChatRequest {
  message: string;
  session_id?: string;
  client_date?: string;
}

export interface ParsedTask {
  title: string;
  description: string | null;
  priority: Priority;
  time_horizon: TimeHorizon;
  due_date: string | null;
  due_time: string | null;
  goal_id: string | null;
  goal_name: string | null;
}

export interface ChatResponse {
  message: string;
  session_id: string;
  message_metadata?: Record<string, unknown>;
  actions?: ParsedTask[];
  action_type?: string;
}

export interface ExecuteTaskData {
  title: string;
  description?: string;
  priority: Priority;
  time_horizon: TimeHorizon;
  due_date?: string | null;
  due_time?: string | null;
  goal_id?: string | null;
}

export interface ExecuteRequest {
  action_type: string;
  data: ExecuteTaskData[];
  session_id?: string;
}

export interface ExecuteResponse {
  success: boolean;
  message: string;
  created_ids?: string[];
  errors?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  message_metadata: Record<string, unknown>;
  created_at: string;
}

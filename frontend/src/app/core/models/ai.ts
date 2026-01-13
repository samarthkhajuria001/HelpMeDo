import { Priority, TimeHorizon } from './task';

export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  client_date?: string;
  history?: ChatHistoryItem[];
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
  actions?: ParsedTask[] | SubtaskActions | GoalPlan;
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
  data: ExecuteTaskData[] | SubtaskActions | GoalPlan;
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

export interface SubtaskItem {
  title: string;
  description?: string;
}

export interface SubtaskActions {
  parent_task_id: string;
  parent_task_title: string;
  subtasks: SubtaskItem[];
}

export interface PlanTask {
  title: string;
  description: string;
  week_range: string;
  priority: 'high' | 'medium' | 'low';
  estimated_pomodoros: number;
}

export interface GoalPlan {
  goal_title: string;
  goal_description: string;
  goal_color: string;
  duration_weeks: number;
  tasks: PlanTask[];
}

export type ActionData = ParsedTask[] | SubtaskActions | GoalPlan;

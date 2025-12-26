// Task-related types matching backend schemas

export type Priority = 'high' | 'medium' | 'low';

export type Status = 'pending' | 'completed' | 'cancelled';

export type TimeHorizon = 'today' | 'week' | 'someday';

export type SubtaskStatus = 'pending' | 'completed' | 'cancelled';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string;
  agent_notes: string;
  status: SubtaskStatus;
  order: number;
  generated_by_agent: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string;
  agent_notes: string | null;
  generated_by_agent: boolean;
  status: Status;
  completed_at: string | null;
  priority: Priority;
  due_date: string | null;
  due_time: string | null;
  time_horizon: TimeHorizon;
  created_at: string;
  updated_at: string;
  subtasks: Subtask[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  goal_id?: string | null;
  priority?: Priority;
  due_date?: string | null;
  due_time?: string | null;
  time_horizon?: TimeHorizon;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  goal_id?: string | null;
  priority?: Priority;
  status?: Status;
  due_date?: string | null;
  due_time?: string | null;
  time_horizon?: TimeHorizon;
}

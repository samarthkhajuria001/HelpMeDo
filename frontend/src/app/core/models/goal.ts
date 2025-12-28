export type GoalColor = 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'cyan';

export const GOAL_COLORS: Record<GoalColor, string> = {
  blue: '#3B82F6',
  green: '#22C55E',
  amber: '#F59E0B',
  rose: '#F43F5E',
  violet: '#8B5CF6',
  cyan: '#06B6D4',
};

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  color: GoalColor;
  archived: boolean;
  created_at: string;
}

export interface GoalCreate {
  name: string;
  color: GoalColor;
}

export interface GoalUpdate {
  name?: string;
  color?: GoalColor;
  archived?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  settings: UserSettings;
  created_at: string;
}

export interface UserSettings {
  agent_instructions?: string;
  pomodoro_duration?: number;
  short_break_duration?: number;
  long_break_duration?: number;
}

export interface UserSettingsUpdate {
  agent_instructions?: string;
}

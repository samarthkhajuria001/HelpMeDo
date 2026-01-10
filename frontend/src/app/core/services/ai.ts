import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ChatRequest,
  ChatResponse,
  ExecuteRequest,
  ExecuteResponse,
  ParsedTask,
  ChatMessage
} from '../models';
import { firstValueFrom } from 'rxjs';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ParsedTask[];
  actionType?: string;
}

const WELCOME_MESSAGE: DisplayMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm Lufy, your task assistant. Tell me what you need to do, like 'buy milk, call mom tomorrow, fix bike'.",
  timestamp: new Date()
};

const MAX_UI_MESSAGES = 15;

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ai`;

  loading = signal(false);
  error = signal<string | null>(null);
  sessionId = signal<string | null>(null);
  historyLoaded = signal(false);

  messages = signal<DisplayMessage[]>([WELCOME_MESSAGE]);

  addMessage(message: DisplayMessage): void {
    this.messages.update(msgs => {
      const updated = [...msgs, message];
      return updated.slice(-MAX_UI_MESSAGES);
    });
  }

  updateMessage(id: string, updates: Partial<DisplayMessage>): void {
    this.messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, ...updates } : m)
    );
  }

  private getClientDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async sendMessage(message: string): Promise<ChatResponse> {
    this.loading.set(true);
    this.error.set(null);

    const recentMessages = this.messages()
      .filter(m => m.id !== 'welcome')
      .slice(-5)
      .map(m => ({ role: m.role, content: m.content }));

    const request: ChatRequest = {
      message,
      session_id: this.sessionId() || undefined,
      client_date: this.getClientDate(),
      history: recentMessages.length > 0 ? recentMessages : undefined
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request)
      );

      if (response.session_id) {
        this.sessionId.set(response.session_id);
      }

      return response;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      this.error.set(errorMsg);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async executeActions(actions: ParsedTask[], actionType: string): Promise<ExecuteResponse> {
    this.loading.set(true);
    this.error.set(null);

    const data = actions.map(task => ({
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      time_horizon: task.time_horizon,
      due_date: task.due_date,
      due_time: task.due_time,
      goal_id: task.goal_id
    }));

    const request: ExecuteRequest = {
      action_type: actionType,
      data,
      session_id: this.sessionId() || undefined
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ExecuteResponse>(`${this.apiUrl}/execute`, request)
      );
      return response;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute actions';
      this.error.set(errorMsg);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async getHistory(sessionId?: string, limit: number = 20): Promise<ChatMessage[]> {
    let url = `${this.apiUrl}/history?limit=${limit}`;
    if (sessionId) {
      url += `&session_id=${sessionId}`;
    }

    try {
      return await firstValueFrom(this.http.get<ChatMessage[]>(url));
    } catch {
      return [];
    }
  }

  async loadHistory(): Promise<void> {
    if (this.historyLoaded()) return;

    try {
      const history = await this.getHistory(undefined, 15);

      if (history.length > 0) {
        const displayMessages: DisplayMessage[] = history.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          actions: msg.message_metadata?.['actions'] as ParsedTask[] | undefined,
          actionType: msg.message_metadata?.['action_type'] as string | undefined
        }));
        this.messages.set(displayMessages);
      }

      this.historyLoaded.set(true);
    } catch {
      this.historyLoaded.set(true);
    }
  }

  clearSession(): void {
    this.sessionId.set(null);
    this.messages.set([WELCOME_MESSAGE]);
    this.historyLoaded.set(false);
  }
}

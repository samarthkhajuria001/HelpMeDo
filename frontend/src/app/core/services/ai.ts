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

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ai`;

  loading = signal(false);
  error = signal<string | null>(null);
  sessionId = signal<string | null>(null);

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

    const request: ChatRequest = {
      message,
      session_id: this.sessionId() || undefined,
      client_date: this.getClientDate()
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

  clearSession(): void {
    this.sessionId.set(null);
  }
}

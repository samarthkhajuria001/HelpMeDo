import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Task, TimeHorizon, Priority } from '../models';

export interface TasksByPriority {
  high: Task[];
  medium: Task[];
  low: Task[];
}

@Injectable({ providedIn: 'root' })
export class Tasks {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tasks`;

  tasks = signal<Task[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  tasksByPriority = computed<TasksByPriority>(() => {
    const allTasks = this.tasks();
    return {
      high: allTasks.filter(t => t.priority === 'high' && t.status === 'pending'),
      medium: allTasks.filter(t => t.priority === 'medium' && t.status === 'pending'),
      low: allTasks.filter(t => t.priority === 'low' && t.status === 'pending')
    };
  });

  completedTasks = computed(() => {
    return this.tasks().filter(t => t.status === 'completed');
  });

  pendingCount = computed(() => {
    return this.tasks().filter(t => t.status === 'pending').length;
  });

  async loadTasks(timeHorizon?: TimeHorizon, goalId?: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (timeHorizon) {
      params = params.set('time_horizon', timeHorizon);
    }
    if (goalId) {
      params = params.set('goal_id', goalId);
    }

    try {
      const tasks = await this.http.get<Task[]>(this.apiUrl, { params }).toPromise();
      this.tasks.set(tasks || []);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load tasks');
      this.tasks.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  clearTasks(): void {
    this.tasks.set([]);
    this.error.set(null);
  }
}

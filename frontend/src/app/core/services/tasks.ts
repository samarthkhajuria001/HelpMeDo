import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Task, TaskCreate, TimeHorizon } from '../models';

export interface TasksByPriority {
  high: Task[];
  medium: Task[];
  low: Task[];
}

export interface TaskCounts {
  today: number;
  week: number;
  someday: number;
}

@Injectable({ providedIn: 'root' })
export class Tasks {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tasks`;

  tasks = signal<Task[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  counts = signal<TaskCounts>({ today: 0, week: 0, someday: 0 });

  private currentHorizon = signal<TimeHorizon | null>(null);

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
    this.currentHorizon.set(timeHorizon || null);

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

  async createTask(data: TaskCreate): Promise<Task> {
    const task = await this.http.post<Task>(this.apiUrl, data).toPromise();

    // Reload current view's tasks if the new task belongs to it
    const horizon = this.currentHorizon();
    if (horizon && task && task.time_horizon === horizon) {
      await this.loadTasks(horizon);
    }

    // Refresh sidebar counts
    this.loadCounts();

    return task!;
  }

  clearTasks(): void {
    this.tasks.set([]);
    this.error.set(null);
  }

  async loadCounts(): Promise<void> {
    try {
      const [today, week, someday] = await Promise.all([
        this.http.get<Task[]>(this.apiUrl, { params: { time_horizon: 'today' } }).toPromise(),
        this.http.get<Task[]>(this.apiUrl, { params: { time_horizon: 'week' } }).toPromise(),
        this.http.get<Task[]>(this.apiUrl, { params: { time_horizon: 'someday' } }).toPromise()
      ]);

      this.counts.set({
        today: (today || []).filter(t => t.status === 'pending').length,
        week: (week || []).filter(t => t.status === 'pending').length,
        someday: (someday || []).filter(t => t.status === 'pending').length
      });
    } catch {
      // Silently fail for counts
    }
  }
}

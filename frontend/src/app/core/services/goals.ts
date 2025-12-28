import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Goal, GoalCreate, GoalUpdate, GoalColor, GOAL_COLORS } from '../models';

@Injectable({ providedIn: 'root' })
export class Goals {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/goals`;

  goals = signal<Goal[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  activeGoals = computed(() => {
    return this.goals().filter(g => !g.archived);
  });

  async loadGoals(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const goals = await this.http.get<Goal[]>(this.apiUrl).toPromise();
      this.goals.set((goals || []).filter(g => !g.archived));
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load goals');
      this.goals.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async createGoal(data: GoalCreate): Promise<Goal> {
    const goal = await this.http.post<Goal>(this.apiUrl, data).toPromise();

    this.goals.update(goals => [...goals, goal!]);

    return goal!;
  }

  async updateGoal(id: string, data: GoalUpdate): Promise<Goal> {
    const goal = await this.http.patch<Goal>(`${this.apiUrl}/${id}`, data).toPromise();

    if (data.archived) {
      this.goals.update(goals => goals.filter(g => g.id !== id));
    } else {
      this.goals.update(goals =>
        goals.map(g => g.id === id ? { ...g, ...data } : g)
      );
    }

    return goal!;
  }

  async deleteGoal(id: string): Promise<void> {
    await this.http.delete(`${this.apiUrl}/${id}`).toPromise();

    this.goals.update(goals => goals.filter(g => g.id !== id));
  }

  getGoalById(id: string): Goal | undefined {
    return this.goals().find(g => g.id === id);
  }

  getGoalColor(goalId: string | null): string | null {
    if (!goalId) return null;
    const goal = this.getGoalById(goalId);
    return goal ? GOAL_COLORS[goal.color] : null;
  }
}

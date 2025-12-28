import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Goals } from '../../../core/services';
import { GoalCreate, Task } from '../../../core/models';
import { GoalNavItem } from '../goal-nav-item/goal-nav-item';
import { CreateGoalModal } from '../create-goal-modal/create-goal-modal';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-goals-section',
  imports: [GoalNavItem, CreateGoalModal],
  templateUrl: './goals-section.html',
  styleUrl: './goals-section.css',
})
export class GoalsSection implements OnInit {
  private goalsService = inject(Goals);
  private http = inject(HttpClient);

  goals = this.goalsService.goals;
  loading = this.goalsService.loading;
  showCreateModal = signal(false);
  goalCounts = signal<Record<string, number>>({});

  ngOnInit() {
    this.goalsService.loadGoals();
    this.loadGoalCounts();
  }

  async loadGoalCounts() {
    try {
      const tasks = await firstValueFrom(this.http.get<Task[]>(`${environment.apiUrl}/tasks`));
      const counts: Record<string, number> = {};

      (tasks || []).forEach(task => {
        if (task.goal_id && task.status === 'pending') {
          counts[task.goal_id] = (counts[task.goal_id] || 0) + 1;
        }
      });

      this.goalCounts.set(counts);
    } catch {
      // Silently fail for counts
    }
  }

  getGoalCount(goalId: string): number {
    return this.goalCounts()[goalId] || 0;
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  async onCreateGoal(data: GoalCreate) {
    try {
      await this.goalsService.createGoal(data);
      this.closeCreateModal();
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  }
}

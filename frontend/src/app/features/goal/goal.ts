import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Tasks, Goals } from '../../core/services';
import { Goal as GoalModel, GoalUpdate } from '../../core/models';
import { TaskList } from '../../shared/components/task-list/task-list';
import { QuickAdd } from '../../shared/components/quick-add/quick-add';
import { GoalHeader } from '../../shared/components/goal-header/goal-header';
import { EditGoalModal } from '../../shared/components/edit-goal-modal/edit-goal-modal';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-goal',
  imports: [TaskList, QuickAdd, GoalHeader, EditGoalModal],
  templateUrl: './goal.html',
  styleUrl: './goal.css',
})
export class Goal implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tasksService = inject(Tasks);
  private goalsService = inject(Goals);
  private routeSub?: Subscription;

  goalId = signal<string | null>(null);
  showEditModal = signal(false);

  goal = computed<GoalModel | undefined>(() => {
    const id = this.goalId();
    return id ? this.goalsService.getGoalById(id) : undefined;
  });

  tasks = this.tasksService.tasks;
  loading = this.tasksService.loading;

  completedCount = computed(() => {
    return this.tasks().filter(t => t.status === 'completed').length;
  });

  totalCount = computed(() => {
    return this.tasks().length;
  });

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.goalId.set(id);
      if (id) {
        this.goalsService.loadGoals();
        this.tasksService.loadTasks(undefined, id);
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  onEdit() {
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  async onArchive() {
    const g = this.goal();
    if (!g) return;

    try {
      await this.goalsService.updateGoal(g.id, { archived: true });
      this.router.navigate(['/today']);
    } catch (err) {
      console.error('Failed to archive goal:', err);
    }
  }

  async onSaveGoal(updates: GoalUpdate) {
    const g = this.goal();
    if (!g) return;

    try {
      await this.goalsService.updateGoal(g.id, updates);
      this.closeEditModal();
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  }

  async onDeleteGoal() {
    const g = this.goal();
    if (!g) return;

    try {
      await this.goalsService.deleteGoal(g.id);
      this.router.navigate(['/today']);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  }
}

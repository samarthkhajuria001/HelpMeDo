import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tasks, Goals } from '../../core/services';
import { Goal as GoalModel, GOAL_COLORS } from '../../core/models';
import { TaskList } from '../../shared/components/task-list/task-list';
import { QuickAdd } from '../../shared/components/quick-add/quick-add';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-goal',
  imports: [TaskList, QuickAdd],
  templateUrl: './goal.html',
  styleUrl: './goal.css',
})
export class Goal implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private tasksService = inject(Tasks);
  private goalsService = inject(Goals);
  private routeSub?: Subscription;

  goalId = signal<string | null>(null);

  goal = computed<GoalModel | undefined>(() => {
    const id = this.goalId();
    return id ? this.goalsService.getGoalById(id) : undefined;
  });

  goalColor = computed(() => {
    const g = this.goal();
    return g ? GOAL_COLORS[g.color] : '#78716C';
  });

  tasks = this.tasksService.tasks;
  loading = this.tasksService.loading;

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
}

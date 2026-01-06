import { Component, inject, OnInit, computed } from '@angular/core';
import { Tasks } from '../../core/services';
import { TaskList } from '../../shared/components/task-list/task-list';
import { QuickAdd } from '../../shared/components/quick-add/quick-add';

@Component({
  selector: 'app-today',
  imports: [TaskList, QuickAdd],
  templateUrl: './today.html',
  styleUrl: './today.css',
})
export class Today implements OnInit {
  private tasksService = inject(Tasks);

  loading = this.tasksService.loading;

  private todayStr = this.getTodayString();

  // Tasks that are overdue (due_date < today) - now limited to 3 days by backend
  overdueTasks = computed(() => {
    return this.tasksService.tasks().filter(t => {
      if (!t.due_date) return false;
      return t.due_date < this.todayStr;
    });
  });

  // Tasks for today (due_date == today OR no due_date)
  todayTasks = computed(() => {
    return this.tasksService.tasks().filter(t => {
      if (!t.due_date) return true; // No due date = show in today
      return t.due_date >= this.todayStr;
    });
  });

  hasOverdue = computed(() => this.overdueTasks().length > 0);

  ngOnInit() {
    // Load today tasks with overdue limited to last 3 days
    this.tasksService.loadTasks('today', undefined, { overdueMaxDays: 3 });
  }

  private getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

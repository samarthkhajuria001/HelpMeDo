import { Component, inject, OnInit, computed } from '@angular/core';
import { Tasks } from '../../core/services';
import { TaskList } from '../../shared/components/task-list/task-list';

@Component({
  selector: 'app-overdue',
  imports: [TaskList],
  templateUrl: './overdue.html',
  styleUrl: './overdue.css',
})
export class Overdue implements OnInit {
  private tasksService = inject(Tasks);

  loading = this.tasksService.loading;
  tasks = this.tasksService.tasks;

  pendingTasks = computed(() => {
    return this.tasks().filter(t => t.status === 'pending');
  });

  ngOnInit() {
    // Load overdue tasks from 4-14 days ago
    this.tasksService.loadTasks('today', undefined, {
      overdueMinDays: 3,
      overdueMaxDays: 14
    });
  }
}

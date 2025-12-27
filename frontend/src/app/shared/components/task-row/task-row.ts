import { Component, input, computed } from '@angular/core';
import { Task } from '../../../core/models';

@Component({
  selector: 'app-task-row',
  imports: [],
  templateUrl: './task-row.html',
  styleUrl: './task-row.css',
})
export class TaskRow {
  task = input.required<Task>();

  isCompleted = computed(() => this.task().status === 'completed');

  priorityClass = computed(() => {
    return `priority-${this.task().priority}`;
  });

  formattedDueDate = computed(() => {
    const date = this.task().due_date;
    if (!date) return null;

    const dueDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dueDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (dueDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  });
}

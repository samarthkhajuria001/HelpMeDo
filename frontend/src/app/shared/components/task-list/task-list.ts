import { Component, input, output, computed } from '@angular/core';
import { Task } from '../../../core/models';
import { SectionHeader } from '../section-header/section-header';
import { TaskRow } from '../task-row/task-row';
import { EmptyState, EmptyStateVariant } from '../empty-state/empty-state';

@Component({
  selector: 'app-task-list',
  imports: [SectionHeader, TaskRow, EmptyState],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css',
})
export class TaskList {
  tasks = input.required<Task[]>();
  loading = input(false);
  emptyVariant = input<EmptyStateVariant>('no_tasks');

  emptyAction = output<void>();

  tasksByPriority = computed(() => {
    const allTasks = this.tasks();
    return {
      high: allTasks.filter(t => t.priority === 'high' && t.status === 'pending'),
      medium: allTasks.filter(t => t.priority === 'medium' && t.status === 'pending'),
      low: allTasks.filter(t => t.priority === 'low' && t.status === 'pending')
    };
  });

  hasTasks = computed(() => {
    const grouped = this.tasksByPriority();
    return grouped.high.length > 0 || grouped.medium.length > 0 || grouped.low.length > 0;
  });

  onEmptyAction() {
    this.emptyAction.emit();
  }
}

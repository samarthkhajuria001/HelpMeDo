import { Component, input, output, computed, inject } from '@angular/core';
import { Task, Status } from '../../../core/models';
import { Tasks } from '../../../core/services';
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
  private tasksService = inject(Tasks);

  tasks = input.required<Task[]>();
  loading = input(false);
  emptyVariant = input<EmptyStateVariant>('no_tasks');

  emptyAction = output<void>();

  tasksByPriority = computed(() => {
    const allTasks = this.tasks();

    // Sort: pending first, then completed (at the end)
    const sortByStatus = (tasks: Task[]) =>
      [...tasks].sort((a, b) => {
        if (a.status === 'pending' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'pending') return 1;
        return 0;
      });

    return {
      high: sortByStatus(allTasks.filter(t => t.priority === 'high')),
      medium: sortByStatus(allTasks.filter(t => t.priority === 'medium')),
      low: sortByStatus(allTasks.filter(t => t.priority === 'low'))
    };
  });

  hasTasks = computed(() => {
    const grouped = this.tasksByPriority();
    return grouped.high.length > 0 || grouped.medium.length > 0 || grouped.low.length > 0;
  });

  completedCounts = computed(() => {
    const grouped = this.tasksByPriority();
    return {
      high: grouped.high.filter(t => t.status === 'completed').length,
      medium: grouped.medium.filter(t => t.status === 'completed').length,
      low: grouped.low.filter(t => t.status === 'completed').length
    };
  });

  onEmptyAction() {
    this.emptyAction.emit();
  }

  onStatusChange(task: Task, status: Status) {
    this.tasksService.updateTask(task.id, { status });
  }

  onTitleChange(task: Task, title: string) {
    this.tasksService.updateTask(task.id, { title });
  }

  onDescriptionChange(task: Task, description: string) {
    this.tasksService.updateTask(task.id, { description });
  }

  onDelete(task: Task) {
    this.tasksService.deleteTask(task.id);
  }
}

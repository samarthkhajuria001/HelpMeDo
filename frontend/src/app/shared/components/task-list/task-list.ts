import { Component, input, output, computed, inject } from '@angular/core';
import { Task, Status, Priority, Subtask, SubtaskStatus } from '../../../core/models';
import { Tasks, Focus } from '../../../core/services';
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
  private focusService = inject(Focus);

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

  onPriorityChange(task: Task, priority: Priority) {
    this.tasksService.updateTask(task.id, { priority });
  }

  onDueDateChange(task: Task, due_date: string | null) {
    this.tasksService.updateTask(task.id, { due_date });
  }

  onGoalChange(task: Task, goal_id: string | null) {
    this.tasksService.updateTask(task.id, { goal_id });
  }

  onEstimateChange(task: Task, estimated_pomodoros: number | null) {
    this.tasksService.updateTask(task.id, { estimated_pomodoros });
  }

  onStartFocus(task: Task) {
    this.focusService.start(task.id);
  }

  onDelete(task: Task) {
    this.tasksService.deleteTask(task.id);
  }

  onSubtaskCreate(task: Task, title: string) {
    this.tasksService.createSubtask(task.id, title);
  }

  onSubtaskStatusChange(task: Task, subtask: Subtask, status: SubtaskStatus) {
    this.tasksService.updateSubtask(task.id, subtask.id, { status });
  }

  onSubtaskTitleChange(task: Task, subtask: Subtask, title: string) {
    this.tasksService.updateSubtask(task.id, subtask.id, { title });
  }

  onSubtaskDelete(task: Task, subtask: Subtask) {
    this.tasksService.deleteSubtask(task.id, subtask.id);
  }
}

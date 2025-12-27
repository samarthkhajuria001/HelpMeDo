import { Component, input, output, computed, signal, OnDestroy } from '@angular/core';
import { Task, Status } from '../../../core/models';

@Component({
  selector: 'app-task-row',
  imports: [],
  templateUrl: './task-row.html',
  styleUrl: './task-row.css',
})
export class TaskRow implements OnDestroy {
  task = input.required<Task>();
  statusChange = output<Status>();
  delete = output<void>();

  isCompleted = computed(() => this.task().status === 'completed');

  // Delete timer state
  deleting = signal(false);
  deleteProgress = signal(0);
  private deleteTimer: ReturnType<typeof setInterval> | null = null;
  private deleteTimeout: ReturnType<typeof setTimeout> | null = null;

  toggleStatus(event: Event) {
    event.stopPropagation();
    const newStatus: Status = this.isCompleted() ? 'pending' : 'completed';
    this.statusChange.emit(newStatus);
  }

  startDelete(event: Event) {
    event.stopPropagation();
    this.deleting.set(true);
    this.deleteProgress.set(0);

    // Progress timer (updates every 50ms for smooth animation)
    const startTime = Date.now();
    const duration = 5000;

    this.deleteTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      this.deleteProgress.set(progress);
    }, 50);

    // Actual delete after 5 seconds
    this.deleteTimeout = setTimeout(() => {
      this.confirmDelete();
    }, duration);
  }

  undoDelete(event: Event) {
    event.stopPropagation();
    this.cancelDelete();
  }

  private confirmDelete() {
    this.clearTimers();
    this.deleting.set(false);
    this.delete.emit();
  }

  private cancelDelete() {
    this.clearTimers();
    this.deleting.set(false);
    this.deleteProgress.set(0);
  }

  private clearTimers() {
    if (this.deleteTimer) {
      clearInterval(this.deleteTimer);
      this.deleteTimer = null;
    }
    if (this.deleteTimeout) {
      clearTimeout(this.deleteTimeout);
      this.deleteTimeout = null;
    }
  }

  ngOnDestroy() {
    this.clearTimers();
  }

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

    // Don't show "Today" - it's redundant on Today page
    if (dueDate.toDateString() === today.toDateString()) {
      return null;
    } else if (dueDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  });

  formattedCreatedDate = computed(() => {
    const date = this.task().created_at;
    if (!date) return null;
    const createdDate = new Date(date);
    return createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

import { Component, input, output, computed, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Task, Status } from '../../../core/models';

@Component({
  selector: 'app-task-row',
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './task-row.html',
  styleUrl: './task-row.css',
})
export class TaskRow implements OnDestroy {
  task = input.required<Task>();

  statusChange = output<Status>();
  titleChange = output<string>();
  descriptionChange = output<string>();
  delete = output<void>();

  isCompleted = computed(() => this.task().status === 'completed');

  // Local expanded state
  expanded = signal(false);

  // Inline edit state
  editing = signal(false);
  editedTitle = signal('');

  // Delete timer state
  deleting = signal(false);
  deleteProgress = signal(0);
  private deleteTimer: ReturnType<typeof setInterval> | null = null;
  private deleteTimeout: ReturnType<typeof setTimeout> | null = null;

  toggleStatus(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    const newStatus: Status = this.isCompleted() ? 'pending' : 'completed';
    this.statusChange.emit(newStatus);
  }

  toggleExpand() {
    if (!this.editing() && !this.deleting()) {
      this.expanded.update(v => !v);
    }
  }

  // Notes editing
  onNotesBlur(event: FocusEvent) {
    const textarea = event.target as HTMLTextAreaElement;
    const newDescription = textarea.value.trim();
    const currentDescription = this.task().description || '';

    if (newDescription !== currentDescription) {
      this.descriptionChange.emit(newDescription);
    }
  }

  startEdit(event: Event) {
    event.stopPropagation();
    this.editedTitle.set(this.task().title);
    this.editing.set(true);
  }

  saveEdit() {
    const newTitle = this.editedTitle().trim();
    if (newTitle && newTitle !== this.task().title) {
      this.titleChange.emit(newTitle);
    }
    this.editing.set(false);
  }

  cancelEdit() {
    this.editing.set(false);
    this.editedTitle.set('');
  }

  onEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
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

  // Parse YYYY-MM-DD string as local date (not UTC)
  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  formattedDueDate = computed(() => {
    const date = this.task().due_date;
    if (!date) return null;

    const dueDate = this.parseDate(date);
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

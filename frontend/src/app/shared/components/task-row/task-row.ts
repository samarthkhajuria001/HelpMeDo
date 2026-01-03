import { Component, input, output, computed, signal, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Task, Status, Priority, Subtask, SubtaskStatus, Goal } from '../../../core/models';
import { Goals } from '../../../core/services';
import { SelectDropdown, SelectOption } from '../select-dropdown/select-dropdown';
import { DatePicker } from '../date-picker/date-picker';
import { SubtaskItem } from '../subtask-item/subtask-item';
import { SubtaskAdd } from '../subtask-add/subtask-add';
import { PomodoroEstimate } from '../pomodoro-estimate/pomodoro-estimate';
import { PomodoroDots } from '../pomodoro-dots/pomodoro-dots';

@Component({
  selector: 'app-task-row',
  imports: [FormsModule, SelectDropdown, DatePicker, SubtaskItem, SubtaskAdd, PomodoroEstimate, PomodoroDots],
  templateUrl: './task-row.html',
  styleUrl: './task-row.css',
})
export class TaskRow implements OnDestroy {
  private goalsService = inject(Goals);

  task = input.required<Task>();

  goalColor = computed(() => {
    const goalId = this.task().goal_id;
    return goalId ? this.goalsService.getGoalColor(goalId) : null;
  });

  goalName = computed(() => {
    const goalId = this.task().goal_id;
    if (!goalId) return null;
    const goal = this.goalsService.getGoalById(goalId);
    return goal?.name || null;
  });

  statusChange = output<Status>();
  titleChange = output<string>();
  descriptionChange = output<string>();
  priorityChange = output<Priority>();
  dueDateChange = output<string | null>();
  goalChange = output<string | null>();
  estimateChange = output<number | null>();
  startFocus = output<void>();
  delete = output<void>();

  subtaskCreate = output<string>();
  subtaskStatusChange = output<{ subtask: Subtask; status: SubtaskStatus }>();
  subtaskTitleChange = output<{ subtask: Subtask; title: string }>();
  subtaskDelete = output<Subtask>();

  priorityOptions: SelectOption[] = [
    { value: 'high', label: 'High', dotColor: '#EF4444' },
    { value: 'medium', label: 'Medium', dotColor: '#F59E0B' },
    { value: 'low', label: 'Low', dotColor: '#22C55E' },
  ];

  goalOptions = computed<SelectOption[]>(() => {
    const goals = this.goalsService.goals();
    const options: SelectOption[] = [
      { value: '', label: 'None' }
    ];
    goals.forEach(g => {
      options.push({
        value: g.id,
        label: g.name,
        dotColor: this.goalsService.getGoalColor(g.id) || undefined
      });
    });
    return options;
  });

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

  // Priority change
  onPriorityChange(value: string) {
    const newPriority = value as Priority;
    if (newPriority !== this.task().priority) {
      this.priorityChange.emit(newPriority);
    }
  }

  // Due date change
  onDueDateChange(date: string | null) {
    if (date !== this.task().due_date) {
      this.dueDateChange.emit(date);
    }
  }

  // Goal change
  onGoalChange(value: string) {
    const newGoalId = value || null;
    if (newGoalId !== this.task().goal_id) {
      this.goalChange.emit(newGoalId);
    }
  }

  // Estimate change
  onEstimateChange(value: number | null) {
    if (value !== this.task().estimated_pomodoros) {
      this.estimateChange.emit(value);
    }
  }

  // Start focus session
  onStartFocus(event: Event) {
    event.stopPropagation();
    this.startFocus.emit();
  }

  // Subtask handlers
  onSubtaskCreate(title: string) {
    this.subtaskCreate.emit(title);
  }

  onSubtaskStatusChange(subtask: Subtask, status: SubtaskStatus) {
    this.subtaskStatusChange.emit({ subtask, status });
  }

  onSubtaskTitleChange(subtask: Subtask, title: string) {
    this.subtaskTitleChange.emit({ subtask, title });
  }

  onSubtaskDelete(subtask: Subtask) {
    this.subtaskDelete.emit(subtask);
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

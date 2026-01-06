import { Component, inject, input, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tasks, Goals } from '../../../core/services';
import { TimeHorizon, Priority } from '../../../core/models';
import { SelectDropdown, SelectOption } from '../select-dropdown/select-dropdown';
import { DatePicker } from '../date-picker/date-picker';
import { PomodoroEstimate } from '../pomodoro-estimate/pomodoro-estimate';

@Component({
  selector: 'app-quick-add',
  imports: [FormsModule, SelectDropdown, DatePicker, PomodoroEstimate],
  templateUrl: './quick-add.html',
  styleUrl: './quick-add.css',
})
export class QuickAdd {
  private tasksService = inject(Tasks);
  private goalsService = inject(Goals);

  defaultHorizon = input<TimeHorizon>('today');
  defaultGoalId = input<string | null>(null);

  title = signal('');
  submitting = signal(false);
  expanded = signal(false);

  priority = signal<Priority>('medium');
  dueDate = signal<string | null>(null);
  goalId = signal<string | null>(null);
  estimatedPomodoros = signal<number | null>(null);

  constructor() {
    
    // Sync goalId with defaultGoalId when it changes
    effect(() => {
      const defaultId = this.defaultGoalId();
      if (defaultId) {
        this.goalId.set(defaultId);
      }
    }, { allowSignalWrites: true });

    // Set initial due date based on defaultHorizon
    effect(() => {
      const horizon = this.defaultHorizon();
      this.dueDate.set(this.getDefaultDueDate(horizon));
    }, { allowSignalWrites: true });

    // TEMPORARY: Test Sentry - remove after testing
    // setTimeout(() => {
    //   throw new Error('Sentry test error from QuickAdd component');
    // }, 3000);
  }

  // Calculate default due date based on time horizon
  private getDefaultDueDate(horizon: TimeHorizon): string | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (horizon) {
      case 'today':
        return this.formatDate(today);
      case 'week':
        // This week = coming Sunday
        const daysUntilSunday = (7 - today.getDay()) % 7;
        const sunday = new Date(today);
        sunday.setDate(sunday.getDate() + daysUntilSunday);
        return this.formatDate(sunday);
      case 'someday':
        return null;
    }
  }

  // Format date as YYYY-MM-DD
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  goalOptions = computed<SelectOption[]>(() => {
    const goals = this.goalsService.goals();
    const options: SelectOption[] = [
      { value: '', label: 'No goal' }
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

  effectiveHorizon = computed(() => {
    const date = this.dueDate();
    if (date) {
      return this.computeHorizonFromDate(date);
    }
    return this.defaultHorizon();
  });

  priorityOptions: SelectOption[] = [
    { value: 'high', label: 'High', dotColor: '#EF4444' },
    { value: 'medium', label: 'Medium', dotColor: '#F59E0B' },
    { value: 'low', label: 'Low', dotColor: '#22C55E' },
  ];

  async onSubmit() {
    const titleValue = this.title().trim();
    if (!titleValue || this.submitting()) return;

    this.submitting.set(true);

    try {
      await this.tasksService.createTask({
        title: titleValue,
        time_horizon: this.effectiveHorizon(),
        priority: this.priority(),
        due_date: this.dueDate(),
        goal_id: this.goalId() || null,
        estimated_pomodoros: this.estimatedPomodoros()
      });
      this.resetForm();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      this.submitting.set(false);
    }
  }

  onPriorityChange(value: string) {
    this.priority.set(value as Priority);
  }

  onDateChange(date: string | null) {
    this.dueDate.set(date);
  }

  onGoalChange(value: string) {
    this.goalId.set(value || null);
  }

  onEstimateChange(value: number | null) {
    this.estimatedPomodoros.set(value);
  }

  // Parse YYYY-MM-DD string as local date (not UTC)
  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private computeHorizonFromDate(dateStr: string): TimeHorizon {
    const date = this.parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays <= 7) return 'week';
    return 'someday';
  }

  private resetForm() {
    this.title.set('');
    this.priority.set('medium');
    this.dueDate.set(this.getDefaultDueDate(this.defaultHorizon()));
    this.goalId.set(this.defaultGoalId());
    this.estimatedPomodoros.set(null);
    this.expanded.set(false);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !this.expanded()) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  toggleExpanded() {
    this.expanded.update(v => !v);
  }
}

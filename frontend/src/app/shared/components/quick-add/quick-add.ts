import { Component, inject, input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tasks } from '../../../core/services';
import { TimeHorizon, Priority } from '../../../core/models';
import { SelectDropdown, SelectOption } from '../select-dropdown/select-dropdown';
import { DatePicker } from '../date-picker/date-picker';

@Component({
  selector: 'app-quick-add',
  imports: [FormsModule, SelectDropdown, DatePicker],
  templateUrl: './quick-add.html',
  styleUrl: './quick-add.css',
})
export class QuickAdd {
  private tasksService = inject(Tasks);

  defaultHorizon = input<TimeHorizon>('today');

  title = signal('');
  submitting = signal(false);
  expanded = signal(false);

  priority = signal<Priority>('medium');
  dueDate = signal<string | null>(null);

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
        due_date: this.dueDate()
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
    this.dueDate.set(null);
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

import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tasks } from '../../../core/services';
import { TimeHorizon } from '../../../core/models';

@Component({
  selector: 'app-quick-add',
  imports: [FormsModule],
  templateUrl: './quick-add.html',
  styleUrl: './quick-add.css',
})
export class QuickAdd {
  private tasksService = inject(Tasks);

  defaultHorizon = input<TimeHorizon>('today');

  title = signal('');
  submitting = signal(false);
  expanded = signal(false);

  async onSubmit() {
    const titleValue = this.title().trim();
    if (!titleValue || this.submitting()) return;

    this.submitting.set(true);

    try {
      await this.tasksService.createTask({
        title: titleValue,
        time_horizon: this.defaultHorizon(),
        priority: 'medium'
      });
      this.title.set('');
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      this.submitting.set(false);
    }
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

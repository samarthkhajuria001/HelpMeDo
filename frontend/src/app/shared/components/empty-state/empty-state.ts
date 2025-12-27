import { Component, input, output, computed } from '@angular/core';

export type EmptyStateVariant = 'no_tasks' | 'all_complete' | 'no_goals' | 'no_goal_tasks' | 'custom';

interface VariantConfig {
  primary: string;
  secondary: string;
  actionLabel: string | null;
}

const VARIANTS: Record<Exclude<EmptyStateVariant, 'custom'>, VariantConfig> = {
  no_tasks: {
    primary: 'No tasks yet',
    secondary: 'Add one above to get started',
    actionLabel: null
  },
  all_complete: {
    primary: 'All done!',
    secondary: 'Enjoy the calm',
    actionLabel: null
  },
  no_goals: {
    primary: 'No goals yet',
    secondary: 'Goals help organize your tasks',
    actionLabel: 'Create a goal'
  },
  no_goal_tasks: {
    primary: 'No tasks in this goal',
    secondary: 'Add tasks to this goal',
    actionLabel: 'Add a task'
  }
};

@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  variant = input<EmptyStateVariant>('no_tasks');
  primary = input<string | null>(null);
  secondary = input<string | null>(null);
  actionLabel = input<string | null>(null);

  action = output<void>();

  config = computed(() => {
    const v = this.variant();
    if (v === 'custom') {
      return {
        primary: this.primary() || '',
        secondary: this.secondary() || '',
        actionLabel: this.actionLabel()
      };
    }
    return VARIANTS[v];
  });

  onAction() {
    this.action.emit();
  }
}

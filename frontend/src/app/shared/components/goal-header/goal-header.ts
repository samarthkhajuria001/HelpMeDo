import { Component, input, output, computed } from '@angular/core';
import { Goal, GOAL_COLORS } from '../../../core/models';

@Component({
  selector: 'app-goal-header',
  templateUrl: './goal-header.html',
  styleUrl: './goal-header.css',
})
export class GoalHeader {
  goal = input.required<Goal>();
  completedCount = input(0);
  totalCount = input(0);

  edit = output<void>();
  archive = output<void>();

  goalColor = computed(() => GOAL_COLORS[this.goal().color]);

  progressPercent = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  progressText = computed(() => {
    const completed = this.completedCount();
    const total = this.totalCount();
    if (total === 0) return 'No tasks';
    return `${completed} of ${total} tasks complete`;
  });

  onEdit() {
    this.edit.emit();
  }

  onArchive() {
    this.archive.emit();
  }
}

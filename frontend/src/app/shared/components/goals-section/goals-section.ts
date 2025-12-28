import { Component, inject, signal, OnInit } from '@angular/core';
import { Goals } from '../../../core/services';
import { GoalCreate } from '../../../core/models';
import { GoalNavItem } from '../goal-nav-item/goal-nav-item';
import { CreateGoalModal } from '../create-goal-modal/create-goal-modal';

@Component({
  selector: 'app-goals-section',
  imports: [GoalNavItem, CreateGoalModal],
  templateUrl: './goals-section.html',
  styleUrl: './goals-section.css',
})
export class GoalsSection implements OnInit {
  private goalsService = inject(Goals);

  goals = this.goalsService.goals;
  loading = this.goalsService.loading;
  showCreateModal = signal(false);

  ngOnInit() {
    this.goalsService.loadGoals();
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  async onCreateGoal(data: GoalCreate) {
    try {
      await this.goalsService.createGoal(data);
      this.closeCreateModal();
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  }
}

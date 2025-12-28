import { Component, input, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Goal, GOAL_COLORS } from '../../../core/models';

@Component({
  selector: 'app-goal-nav-item',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './goal-nav-item.html',
  styleUrl: './goal-nav-item.css',
})
export class GoalNavItem {
  goal = input.required<Goal>();
  count = input(0);

  dotColor = computed(() => GOAL_COLORS[this.goal().color]);
  routerPath = computed(() => `/goal/${this.goal().id}`);
}

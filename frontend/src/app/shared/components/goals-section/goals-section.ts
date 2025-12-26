import { Component, output } from '@angular/core';

@Component({
  selector: 'app-goals-section',
  imports: [],
  templateUrl: './goals-section.html',
  styleUrl: './goals-section.css',
})
export class GoalsSection {
  addGoal = output<void>();

  onAddGoal() {
    this.addGoal.emit();
  }
}

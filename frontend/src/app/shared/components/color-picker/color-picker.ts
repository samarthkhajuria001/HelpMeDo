import { Component, input, output } from '@angular/core';
import { GoalColor, GOAL_COLORS } from '../../../core/models';

interface ColorOption {
  value: GoalColor;
  hex: string;
  label: string;
}

@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.css',
})
export class ColorPicker {
  value = input<GoalColor>('blue');
  change = output<GoalColor>();

  colors: ColorOption[] = [
    { value: 'blue', hex: GOAL_COLORS.blue, label: 'Blue' },
    { value: 'green', hex: GOAL_COLORS.green, label: 'Green' },
    { value: 'amber', hex: GOAL_COLORS.amber, label: 'Amber' },
    { value: 'rose', hex: GOAL_COLORS.rose, label: 'Rose' },
    { value: 'violet', hex: GOAL_COLORS.violet, label: 'Violet' },
    { value: 'cyan', hex: GOAL_COLORS.cyan, label: 'Cyan' },
  ];

  selectColor(color: GoalColor) {
    this.change.emit(color);
  }
}

import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-pomodoro-estimate',
  imports: [],
  templateUrl: './pomodoro-estimate.html',
  styleUrl: './pomodoro-estimate.css',
})
export class PomodoroEstimate {
  value = input<number | null>(null);
  placeholder = input('Est.');

  change = output<number | null>();

  hasValue = computed(() => this.value() !== null && this.value()! >= 1);

  formattedTime = computed(() => {
    const count = this.value();
    if (count === null || count < 1) return '';

    const totalMinutes = count * 25;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `~${minutes}min`;
    } else if (minutes === 0) {
      return `~${hours}h`;
    } else {
      return `~${hours}h ${minutes}min`;
    }
  });

  increment(event: Event) {
    event.stopPropagation();
    const current = this.value() ?? 0;
    this.change.emit(current + 1);
  }

  decrement(event: Event) {
    event.stopPropagation();
    const current = this.value() ?? 0;
    if (current <= 1) {
      this.change.emit(null);
    } else {
      this.change.emit(current - 1);
    }
  }
}

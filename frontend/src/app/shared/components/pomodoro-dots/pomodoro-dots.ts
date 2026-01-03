import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-pomodoro-dots',
  imports: [],
  templateUrl: './pomodoro-dots.html',
  styleUrl: './pomodoro-dots.css',
})
export class PomodoroDots {
  completed = input<number>(0);
  estimated = input<number | null>(null);
  size = input<'sm' | 'md'>('sm');

  showDots = computed(() => (this.estimated() ?? 0) >= 1);

  dots = computed(() => {
    const est = this.estimated() ?? 0;
    if (est < 1) return [];

    const comp = Math.min(this.completed(), est);
    const display = Math.min(est, 5);

    return Array.from({ length: display }, (_, i) => ({
      filled: i < comp
    }));
  });

  overflow = computed(() => {
    const est = this.estimated() ?? 0;
    return est > 5 ? est - 5 : 0;
  });
}

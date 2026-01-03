import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-focus-timer',
  imports: [],
  templateUrl: './focus-timer.html',
  styleUrl: './focus-timer.css',
})
export class FocusTimer {
  // Inputs
  taskTitle = input.required<string>();
  remainingSeconds = input.required<number>();
  totalSeconds = input<number>(1500);
  isPaused = input<boolean>(false);
  loading = input<boolean>(false);

  // Outputs
  pause = output<void>();
  resume = output<void>();
  abandon = output<void>();

  // Computed: Format time as MM:SS
  formattedTime = computed(() => {
    const total = this.remainingSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  // Computed: Progress percentage (0-100)
  progressPercent = computed(() => {
    const total = this.totalSeconds();
    if (total <= 0) return 0;
    const remaining = this.remainingSeconds();
    const elapsed = total - remaining;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  });

  onPause() {
    if (!this.loading()) {
      this.pause.emit();
    }
  }

  onResume() {
    if (!this.loading()) {
      this.resume.emit();
    }
  }

  onAbandon() {
    if (!this.loading()) {
      this.abandon.emit();
    }
  }
}

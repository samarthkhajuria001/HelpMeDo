import { Component, input, output, computed, signal, effect } from '@angular/core';

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
  error = input<string | null>(null);

  // Local error display state (for auto-dismiss)
  protected showError = signal(false);
  private errorTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Auto-show and auto-dismiss error after 4 seconds
    effect(() => {
      const err = this.error();
      if (err) {
        this.showError.set(true);
        this.clearErrorTimeout();
        this.errorTimeout = setTimeout(() => {
          this.showError.set(false);
        }, 4000);
      } else {
        this.showError.set(false);
      }
    });
  }

  private clearErrorTimeout(): void {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
  }

  // Outputs
  pause = output<void>();
  resume = output<void>();
  done = output<void>();
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

  onDone() {
    if (!this.loading()) {
      this.done.emit();
    }
  }

  onAbandon() {
    if (!this.loading()) {
      this.abandon.emit();
    }
  }
}

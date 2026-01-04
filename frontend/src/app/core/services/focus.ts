import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  FocusSession,
  FocusSessionStart,
  FocusSessionActive,
  FocusSessionPauseResponse,
  FocusSessionResumeResponse,
  FocusSessionCompleteResponse,
  FocusSessionAbandonResponse,
} from '../models';
import { Tasks } from './tasks';

@Injectable({ providedIn: 'root' })
export class Focus implements OnDestroy {
  private http = inject(HttpClient);
  private tasksService = inject(Tasks);
  private apiUrl = `${environment.apiUrl}/focus`;

  // Audio for completion chime
  private completionSound: HTMLAudioElement | null = null;

  // Visibility change handler reference for cleanup
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    this.setupVisibilityHandler();
  }

  /**
   * Setup browser visibility change handler
   * Syncs timer when user returns to tab (browsers throttle setInterval when hidden)
   */
  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.hasActiveSession() && this.isRunning()) {
        this.syncTimerOnVisibility();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Sync timer with actual elapsed time when tab becomes visible
   * Called because setInterval gets throttled/paused when tab is hidden
   */
  private syncTimerOnVisibility(): void {
    const session = this.activeSession();
    if (!session) return;

    this.calculateRemainingTime(session);

    // If timer expired while tab was hidden, auto-complete
    // (user was presumably working, just had app minimized)
    if (this.remainingSeconds() <= 0) {
      this.complete();
    }
  }

  // Session state
  activeSession = signal<FocusSession | null>(null);
  remainingSeconds = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);

  // Timer interval reference
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Computed states
  hasActiveSession = computed(() => this.activeSession() !== null);
  currentTaskId = computed(() => this.activeSession()?.task_id ?? null);

  isRunning = computed(() => {
    const session = this.activeSession();
    if (!session) return false;
    const pauses = session.pauses || [];
    if (pauses.length === 0) return true;
    const lastPause = pauses[pauses.length - 1];
    return lastPause.resumed_at !== null;
  });

  isPaused = computed(() => {
    const session = this.activeSession();
    if (!session) return false;
    const pauses = session.pauses || [];
    if (pauses.length === 0) return false;
    const lastPause = pauses[pauses.length - 1];
    return lastPause.resumed_at === null;
  });

  progressPercent = computed(() => {
    const session = this.activeSession();
    if (!session) return 0;
    const elapsed = session.planned_seconds - this.remainingSeconds();
    return Math.min(100, (elapsed / session.planned_seconds) * 100);
  });

  formattedTime = computed(() => {
    const total = this.remainingSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  /**
   * Load active session from server (call on app init)
   * If timer expired while user was away, abandon the session (not complete)
   */
  async loadActiveSession(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.http.get<FocusSessionActive>(`${this.apiUrl}/active`).toPromise();
      const session = response?.session ?? null;
      this.activeSession.set(session);

      if (session) {
        this.calculateRemainingTime(session);

        // If timer expired while user was away, abandon instead of completing
        // User wasn't actively present, so it shouldn't count as completed
        if (this.remainingSeconds() <= 0) {
          // Clear local state first so user isn't blocked if API fails
          this.activeSession.set(null);
          this.remainingSeconds.set(0);
          this.clearLocalStorage();
          // Try to abandon on backend (fire and forget - don't block user)
          this.http.post(`${this.apiUrl}/abandon`, {}).toPromise().catch(() => {});
          return;
        }

        if (this.isRunning()) {
          this.startTimer();
        }
      }
    } catch (err: any) {
      this.error.set(err.error?.detail || 'Failed to load active session');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Start a new focus session for a task
   */
  async start(taskId: string): Promise<FocusSession | null> {
    // Prevent duplicate calls (race condition from double-clicks)
    if (this.loading() || this.hasActiveSession()) {
      return null;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const body: FocusSessionStart = { task_id: taskId };
      const session = await this.http.post<FocusSession>(`${this.apiUrl}/start`, body).toPromise();

      if (session) {
        this.activeSession.set(session);
        this.remainingSeconds.set(session.planned_seconds);
        this.startTimer();
        this.saveToLocalStorage(session);
      }

      return session ?? null;
    } catch (err: any) {
      this.error.set(err.error?.detail || 'Failed to start session');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Pause the active session
   */
  async pause(): Promise<boolean> {
    // Prevent duplicate calls
    if (this.loading() || !this.hasActiveSession() || this.isPaused()) {
      return false;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.http.post<FocusSessionPauseResponse>(`${this.apiUrl}/pause`, {}).toPromise();

      if (response) {
        // Update local session state
        this.activeSession.update(session => {
          if (!session) return null;
          return {
            ...session,
            pause_count: response.pause_count,
            pauses: [...session.pauses, { paused_at: response.paused_at, resumed_at: null }]
          };
        });
        this.stopTimer();
        this.saveToLocalStorage(this.activeSession());
      }

      return true;
    } catch (err: any) {
      this.error.set(err.error?.detail || 'Failed to pause session');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Resume a paused session
   */
  async resume(): Promise<boolean> {
    // Prevent duplicate calls
    if (this.loading() || !this.hasActiveSession() || !this.isPaused()) {
      return false;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.http.post<FocusSessionResumeResponse>(`${this.apiUrl}/resume`, {}).toPromise();

      if (response) {
        // Update local session state
        this.activeSession.update(session => {
          if (!session) return null;
          const pauses = [...session.pauses];
          if (pauses.length > 0) {
            pauses[pauses.length - 1] = {
              ...pauses[pauses.length - 1],
              resumed_at: new Date().toISOString()
            };
          }
          return {
            ...session,
            pause_count: response.pause_count,
            total_pause_seconds: response.total_pause_seconds,
            pauses
          };
        });
        this.startTimer();
        this.saveToLocalStorage(this.activeSession());
      }

      return true;
    } catch (err: any) {
      this.error.set(err.error?.detail || 'Failed to resume session');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Complete the active session (pomodoro finished)
   */
  async complete(): Promise<FocusSessionCompleteResponse | null> {
    // Prevent duplicate calls
    if (this.loading() || !this.hasActiveSession()) {
      return null;
    }

    const taskId = this.currentTaskId();
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.http.post<FocusSessionCompleteResponse>(`${this.apiUrl}/complete`, {}).toPromise();

      if (response) {
        this.stopTimer();
        this.activeSession.set(null);
        this.remainingSeconds.set(0);
        this.clearLocalStorage();

        // Update local task state to reflect new actual_pomodoros
        if (taskId) {
          this.tasksService.tasks.update(tasks =>
            tasks.map(t => t.id === taskId
              ? { ...t, actual_pomodoros: response.task_actual_pomodoros }
              : t
            )
          );
        }

        // Play completion sound
        this.playCompletionSound();
      }

      return response ?? null;
    } catch (err: any) {
      this.error.set(err.error?.detail || 'Failed to complete session');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Abandon the active session (quit early)
   */
  async abandon(): Promise<FocusSessionAbandonResponse | null> {
    // Prevent duplicate calls
    if (this.loading() || !this.hasActiveSession()) {
      return null;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.http.post<FocusSessionAbandonResponse>(`${this.apiUrl}/abandon`, {}).toPromise();

      if (response) {
        this.stopTimer();
        this.activeSession.set(null);
        this.remainingSeconds.set(0);
        this.clearLocalStorage();
      }

      return response ?? null;
    } catch (err: any) {
      this.error.set(err.error?.detail || 'Failed to abandon session');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Calculate remaining time based on session data
   */
  private calculateRemainingTime(session: FocusSession): void {
    const now = new Date();
    const startedAt = new Date(session.started_at);

    // Calculate total elapsed time
    let totalElapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Subtract pause time
    totalElapsed -= session.total_pause_seconds;

    // If currently paused, don't count time since last pause
    const pauses = session.pauses || [];
    if (pauses.length > 0) {
      const lastPause = pauses[pauses.length - 1];
      if (lastPause.resumed_at === null) {
        const pausedAt = new Date(lastPause.paused_at);
        const pausedDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
        totalElapsed -= pausedDuration;
      }
    }

    const remaining = Math.max(0, session.planned_seconds - totalElapsed);
    this.remainingSeconds.set(remaining);
  }

  /**
   * Start the countdown timer
   */
  private startTimer(): void {
    this.stopTimer();

    this.timerInterval = setInterval(() => {
      const current = this.remainingSeconds();
      if (current <= 1) {
        // Timer finished - stop first to prevent duplicate calls
        this.stopTimer();
        this.remainingSeconds.set(0);
        // Auto-complete the session
        this.complete();
      } else {
        this.remainingSeconds.set(current - 1);
      }
    }, 1000);
  }

  /**
   * Stop the countdown timer
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Save session to localStorage for recovery
   */
  private saveToLocalStorage(session: FocusSession | null): void {
    if (session) {
      localStorage.setItem('focus_session', JSON.stringify({
        sessionId: session.id,
        remainingSeconds: this.remainingSeconds()
      }));
    }
  }

  /**
   * Clear localStorage
   */
  private clearLocalStorage(): void {
    localStorage.removeItem('focus_session');
  }

  /**
   * Play completion chime sound
   */
  private playCompletionSound(): void {
    try {
      // Create audio element if not exists
      if (!this.completionSound) {
        this.completionSound = new Audio();
        // Use a simple built-in notification sound via Web Audio API
        this.completionSound.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
          Array(300).fill('//v/+//7/wEAAQABAAEA').join('');
      }

      // Use Web Audio API for a pleasant chime
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant bell-like sound
      oscillator.frequency.setValueAtTime(830, audioContext.currentTime); // G#5
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Second tone for chime effect
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1046, audioContext.currentTime); // C6
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.8);
      }, 150);
    } catch (e) {
      // Audio not supported or blocked, fail silently
      console.warn('Could not play completion sound:', e);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    // Clean up visibility handler
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}

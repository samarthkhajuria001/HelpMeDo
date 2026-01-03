import { Component, output, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Focus, Tasks } from '../../core/services';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  private focusService = inject(Focus);
  private tasksService = inject(Tasks);

  menuClick = output<void>();
  aiClick = output<void>();

  protected today = new Date();

  // Focus session state for header indicator
  protected hasActiveSession = this.focusService.hasActiveSession;
  protected formattedTime = this.focusService.formattedTime;
  protected isPaused = this.focusService.isPaused;

  // Try to get active task title from loaded tasks
  protected activeTaskTitle = computed(() => {
    const taskId = this.focusService.currentTaskId();
    if (!taskId) return null;
    const task = this.tasksService.tasks().find(t => t.id === taskId);
    return task?.title ?? 'Focus';
  });
}

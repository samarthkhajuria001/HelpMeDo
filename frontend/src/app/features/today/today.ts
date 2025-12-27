import { Component, inject, OnInit } from '@angular/core';
import { Tasks } from '../../core/services';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { TaskRow } from '../../shared/components/task-row/task-row';

@Component({
  selector: 'app-today',
  imports: [SectionHeader, EmptyState, TaskRow],
  templateUrl: './today.html',
  styleUrl: './today.css',
})
export class Today implements OnInit {
  private tasksService = inject(Tasks);

  tasks = this.tasksService.tasks;
  loading = this.tasksService.loading;
  tasksByPriority = this.tasksService.tasksByPriority;

  ngOnInit() {
    this.tasksService.loadTasks('today');
  }
}

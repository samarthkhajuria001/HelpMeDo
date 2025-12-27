import { Component, inject, OnInit } from '@angular/core';
import { Tasks } from '../../core/services';
import { TaskList } from '../../shared/components/task-list/task-list';
import { QuickAdd } from '../../shared/components/quick-add/quick-add';

@Component({
  selector: 'app-week',
  imports: [TaskList, QuickAdd],
  templateUrl: './week.html',
  styleUrl: './week.css',
})
export class Week implements OnInit {
  private tasksService = inject(Tasks);

  tasks = this.tasksService.tasks;
  loading = this.tasksService.loading;

  ngOnInit() {
    this.tasksService.loadTasks('week');
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { Tasks } from '../../core/services';
import { TaskList } from '../../shared/components/task-list/task-list';

@Component({
  selector: 'app-week',
  imports: [TaskList],
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

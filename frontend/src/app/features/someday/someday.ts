import { Component, inject, OnInit } from '@angular/core';
import { Tasks } from '../../core/services';
import { TaskList } from '../../shared/components/task-list/task-list';
import { QuickAdd } from '../../shared/components/quick-add/quick-add';

@Component({
  selector: 'app-someday',
  imports: [TaskList, QuickAdd],
  templateUrl: './someday.html',
  styleUrl: './someday.css',
})
export class Someday implements OnInit {
  private tasksService = inject(Tasks);

  tasks = this.tasksService.tasks;
  loading = this.tasksService.loading;

  ngOnInit() {
    this.tasksService.loadTasks('someday');
  }
}

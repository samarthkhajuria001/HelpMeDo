import { Component, inject, OnInit, computed } from '@angular/core';
import { Tasks } from '../../core/services';
import { Task } from '../../core/models';
import { TaskRow } from '../../shared/components/task-row/task-row';

interface DateGroup {
  label: string;
  date: string;
  tasks: Task[];
}

@Component({
  selector: 'app-completed',
  imports: [TaskRow],
  templateUrl: './completed.html',
  styleUrl: './completed.css',
})
export class Completed implements OnInit {
  private tasksService = inject(Tasks);

  loading = this.tasksService.loading;
  tasks = this.tasksService.tasks;

  // Group tasks by completion date
  taskGroups = computed<DateGroup[]>(() => {
    const tasks = this.tasks();
    if (!tasks.length) return [];

    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(new Date(Date.now() - 86400000));

    // Group tasks by completed_at date
    const groups = new Map<string, Task[]>();

    tasks.forEach(task => {
      const completedDate = task.completed_at
        ? this.getDateString(new Date(task.completed_at))
        : today;

      if (!groups.has(completedDate)) {
        groups.set(completedDate, []);
      }
      groups.get(completedDate)!.push(task);
    });

    // Sort dates descending (most recent first)
    const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    // Convert to DateGroup array with labels
    return sortedDates.map(date => {
      let label: string;
      if (date === today) {
        label = 'Today';
      } else if (date === yesterday) {
        label = 'Yesterday';
      } else {
        label = this.formatDateLabel(date);
      }

      return {
        label,
        date,
        tasks: groups.get(date)!.sort((a, b) => {
          // Sort by completed_at descending within each group
          const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          return bTime - aTime;
        })
      };
    });
  });

  totalCompleted = computed(() => this.tasks().length);

  ngOnInit() {
    this.tasksService.loadCompletedTasks();
  }

  private getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateLabel(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const now = new Date();

    // If same year, don't show year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Handler methods for TaskRow events (completed tasks are read-only but need handlers)
  onStatusChange(task: Task, status: string) {
    this.tasksService.updateTask(task.id, { status: status as any });
  }

  onDelete(task: Task) {
    this.tasksService.deleteTask(task.id);
  }
}

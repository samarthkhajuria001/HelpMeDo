import { Component, input, output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subtask, SubtaskStatus } from '../../../core/models';

@Component({
  selector: 'app-subtask-item',
  imports: [FormsModule],
  templateUrl: './subtask-item.html',
  styleUrl: './subtask-item.css',
})
export class SubtaskItem {
  subtask = input.required<Subtask>();

  statusChange = output<SubtaskStatus>();
  titleChange = output<string>();
  delete = output<void>();

  editing = signal(false);
  editedTitle = signal('');

  isCompleted = computed(() => this.subtask().status === 'completed');

  toggleStatus(event: MouseEvent) {
    event.stopPropagation();
    const newStatus: SubtaskStatus = this.isCompleted() ? 'pending' : 'completed';
    this.statusChange.emit(newStatus);
  }

  startEdit(event: MouseEvent) {
    event.stopPropagation();
    this.editedTitle.set(this.subtask().title);
    this.editing.set(true);
  }

  saveEdit() {
    const newTitle = this.editedTitle().trim();
    if (newTitle && newTitle !== this.subtask().title) {
      this.titleChange.emit(newTitle);
    }
    this.editing.set(false);
  }

  cancelEdit() {
    this.editing.set(false);
    this.editedTitle.set('');
  }

  onEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  onDelete(event: MouseEvent) {
    event.stopPropagation();
    this.delete.emit();
  }
}

import { Component, input, output, signal, HostListener, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Goal, GoalColor, GoalUpdate } from '../../../core/models';
import { ColorPicker } from '../color-picker/color-picker';

@Component({
  selector: 'app-edit-goal-modal',
  imports: [FormsModule, ColorPicker],
  templateUrl: './edit-goal-modal.html',
  styleUrl: './edit-goal-modal.css',
})
export class EditGoalModal implements AfterViewInit {
  goal = input.required<Goal>();

  close = output<void>();
  save = output<GoalUpdate>();
  delete = output<void>();

  name = signal('');
  color = signal<GoalColor>('blue');
  submitting = signal(false);
  showDeleteConfirm = signal(false);

  nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  ngAfterViewInit() {
    // Pre-fill with current goal values
    this.name.set(this.goal().name);
    this.color.set(this.goal().color);
    setTimeout(() => this.nameInput()?.nativeElement.focus(), 0);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.showDeleteConfirm()) {
      this.showDeleteConfirm.set(false);
    } else {
      this.onClose();
    }
  }

  onSubmit() {
    const trimmedName = this.name().trim();
    if (!trimmedName || this.submitting()) return;

    const updates: GoalUpdate = {};

    if (trimmedName !== this.goal().name) {
      updates.name = trimmedName;
    }
    if (this.color() !== this.goal().color) {
      updates.color = this.color();
    }

    // Only emit if there are changes
    if (Object.keys(updates).length > 0) {
      this.save.emit(updates);
    } else {
      this.onClose();
    }
  }

  onClose() {
    if (!this.submitting()) {
      this.close.emit();
    }
  }

  onColorChange(color: GoalColor) {
    this.color.set(color);
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.name().trim()) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  onDeleteClick() {
    this.showDeleteConfirm.set(true);
  }

  onDeleteCancel() {
    this.showDeleteConfirm.set(false);
  }

  onDeleteConfirm() {
    this.delete.emit();
  }
}

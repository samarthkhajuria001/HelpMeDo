import { Component, output, signal, HostListener, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoalColor, GoalCreate } from '../../../core/models';
import { ColorPicker } from '../color-picker/color-picker';

@Component({
  selector: 'app-create-goal-modal',
  imports: [FormsModule, ColorPicker],
  templateUrl: './create-goal-modal.html',
  styleUrl: './create-goal-modal.css',
})
export class CreateGoalModal implements AfterViewInit {
  close = output<void>();
  create = output<GoalCreate>();

  name = signal('');
  color = signal<GoalColor>('blue');
  submitting = signal(false);

  nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  ngAfterViewInit() {
    setTimeout(() => this.nameInput()?.nativeElement.focus(), 0);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.onClose();
  }

  onSubmit() {
    const trimmedName = this.name().trim();
    if (!trimmedName || this.submitting()) return;

    this.create.emit({
      name: trimmedName,
      color: this.color()
    });
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
}

import { Component, output, signal, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-subtask-add',
  imports: [FormsModule],
  templateUrl: './subtask-add.html',
  styleUrl: './subtask-add.css',
})
export class SubtaskAdd {
  create = output<string>();

  active = signal(false);
  title = signal('');

  inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  activate() {
    this.active.set(true);
    setTimeout(() => this.inputRef()?.nativeElement.focus(), 0);
  }

  onSubmit() {
    const value = this.title().trim();
    if (value) {
      this.create.emit(value);
      this.title.set('');
    }
  }

  onCancel() {
    this.active.set(false);
    this.title.set('');
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  onBlur() {
    const value = this.title().trim();
    if (value) {
      this.onSubmit();
    }
    this.onCancel();
  }
}

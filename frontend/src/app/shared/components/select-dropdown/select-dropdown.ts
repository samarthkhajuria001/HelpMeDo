import { Component, input, output, signal, computed, HostListener, ElementRef, inject } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
  dotColor?: string;
}

@Component({
  selector: 'app-select-dropdown',
  imports: [],
  templateUrl: './select-dropdown.html',
  styleUrl: './select-dropdown.css',
})
export class SelectDropdown {
  private elementRef = inject(ElementRef);

  options = input.required<SelectOption[]>();
  value = input.required<string>();
  placeholder = input('Select...');

  change = output<string>();

  open = signal(false);

  selectedOption = computed(() => {
    return this.options().find(o => o.value === this.value()) || null;
  });

  displayLabel = computed(() => {
    const selected = this.selectedOption();
    return selected ? selected.label : this.placeholder();
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.open.set(false);
  }

  toggle() {
    this.open.update(v => !v);
  }

  select(option: SelectOption) {
    this.change.emit(option.value);
    this.open.set(false);
  }
}

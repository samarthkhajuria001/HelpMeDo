import { Component, input, output, signal, computed, HostListener, ElementRef, inject } from '@angular/core';

type ViewMode = 'presets' | 'calendar';

@Component({
  selector: 'app-date-picker',
  imports: [],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
})
export class DatePicker {
  private elementRef = inject(ElementRef);

  value = input<string | null>(null);
  change = output<string | null>();

  open = signal(false);
  viewMode = signal<ViewMode>('presets');
  currentMonth = signal(new Date());

  // Format date as YYYY-MM-DD in local timezone (not UTC)
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Parse YYYY-MM-DD string as local date (not UTC)
  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  todayString = computed(() => {
    return this.formatDate(new Date());
  });

  displayValue = computed(() => {
    const val = this.value();
    if (!val) return 'No deadline';

    const date = this.parseDate(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate this Sunday
    const thisSunday = new Date(today);
    const daysUntilSunday = (7 - today.getDay()) % 7;
    thisSunday.setDate(thisSunday.getDate() + daysUntilSunday);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (date.toDateString() === thisSunday.toDateString() && daysUntilSunday > 1) return 'This week';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  calendarDays = computed(() => {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    const days: (Date | null)[] = [];

    // Add empty slots for days before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, monthIndex, d));
    }

    return days;
  });

  monthLabel = computed(() => {
    return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  toggle() {
    if (this.open()) {
      this.close();
    } else {
      this.viewMode.set('presets');
      this.currentMonth.set(new Date());
      this.open.set(true);
    }
  }

  close() {
    this.open.set(false);
    this.viewMode.set('presets');
  }

  selectPreset(preset: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let date: Date | null = null;

    switch (preset) {
      case 'today':
        date = today;
        break;
      case 'tomorrow':
        date = new Date(today);
        date.setDate(date.getDate() + 1);
        break;
      case 'thisWeek':
        // This week = coming Sunday (end of week)
        // Sunday is day 0, so if today is Sunday, daysUntilSunday = 0
        // If today is Monday (1), daysUntilSunday = 6
        date = new Date(today);
        const daysUntilSunday = (7 - today.getDay()) % 7;
        date.setDate(date.getDate() + daysUntilSunday);
        break;
      case 'noDeadline':
        this.change.emit(null);
        this.close();
        return;
    }

    if (date) {
      this.change.emit(this.formatDate(date));
    }
    this.close();
  }

  showCalendar() {
    this.viewMode.set('calendar');
  }

  prevMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  selectDate(date: Date) {
    this.change.emit(this.formatDate(date));
    this.close();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isSelected(date: Date): boolean {
    const val = this.value();
    if (!val) return false;
    return this.formatDate(date) === val;
  }

  isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  }
}

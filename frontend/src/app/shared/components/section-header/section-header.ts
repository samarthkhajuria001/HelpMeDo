import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-header',
  imports: [],
  templateUrl: './section-header.html',
  styleUrl: './section-header.css',
})
export class SectionHeader {
  title = input.required<string>();
  count = input<number | null>(null);
  total = input<number | null>(null);
}

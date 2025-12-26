import { Component, output } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  menuClick = output<void>();
  aiClick = output<void>();

  protected today = new Date();
}

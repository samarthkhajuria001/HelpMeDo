import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav-item',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-item.html',
  styleUrl: './nav-item.css'
})
export class NavItem {
  label = input.required<string>();
  route = input.required<string>();
  count = input<number | null>(null);
}

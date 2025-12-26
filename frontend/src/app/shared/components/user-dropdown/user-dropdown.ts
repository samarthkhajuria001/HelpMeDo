import { Component, inject, output, HostListener } from '@angular/core';
import { Auth } from '../../../core/auth';

@Component({
  selector: 'app-user-dropdown',
  imports: [],
  templateUrl: './user-dropdown.html',
  styleUrl: './user-dropdown.css'
})
export class UserDropdown {
  private auth = inject(Auth);

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  onProfile() {
    // TODO: Navigate to profile page
    this.close.emit();
  }

  onSettings() {
    // TODO: Navigate to settings page
    this.close.emit();
  }

  onLogout() {
    this.auth.logout();
    this.close.emit();
  }
}

import { Component, inject, output, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../../core/auth';

@Component({
  selector: 'app-user-dropdown',
  imports: [],
  templateUrl: './user-dropdown.html',
  styleUrl: './user-dropdown.css'
})
export class UserDropdown {
  private auth = inject(Auth);
  private router = inject(Router);

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  onProfile() {
    this.router.navigate(['/profile']);
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

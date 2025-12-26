import { Component, inject, signal, computed, output } from '@angular/core';
import { Auth } from '../../../core/auth';

@Component({
  selector: 'app-user-account',
  imports: [],
  templateUrl: './user-account.html',
  styleUrl: './user-account.css'
})
export class UserAccount {
  private auth = inject(Auth);

  user = this.auth.user;
  dropdownOpen = signal(false);

  dropdownToggle = output<boolean>();

  initials = computed(() => {
    const name = this.user()?.name || '';
    return name.charAt(0).toUpperCase();
  });

  toggleDropdown() {
    this.dropdownOpen.update(v => !v);
    this.dropdownToggle.emit(this.dropdownOpen());
  }
}

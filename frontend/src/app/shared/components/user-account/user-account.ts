import { Component, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { Auth } from '../../../core/auth';
import { UserDropdown } from '../user-dropdown/user-dropdown';

@Component({
  selector: 'app-user-account',
  imports: [UserDropdown],
  templateUrl: './user-account.html',
  styleUrl: './user-account.css'
})
export class UserAccount {
  private auth = inject(Auth);
  private elementRef = inject(ElementRef);

  user = this.auth.user;
  dropdownOpen = signal(false);

  initials = computed(() => {
    const name = this.user()?.name || '';
    return name.charAt(0).toUpperCase();
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.dropdownOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  toggleDropdown() {
    this.dropdownOpen.update(v => !v);
  }

  closeDropdown() {
    this.dropdownOpen.set(false);
  }
}

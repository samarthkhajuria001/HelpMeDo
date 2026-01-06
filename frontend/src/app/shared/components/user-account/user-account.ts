import { Component, inject, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../core/services';

@Component({
  selector: 'app-user-account',
  imports: [],
  templateUrl: './user-account.html',
  styleUrl: './user-account.css'
})
export class UserAccount implements OnInit {
  private router = inject(Router);
  private userService = inject(UserService);

  user = this.userService.user;

  ngOnInit() {
    this.userService.loadUser();
  }

  initials = computed(() => {
    const name = this.user()?.name || '';
    return name.charAt(0).toUpperCase();
  });

  goToProfile() {
    this.router.navigate(['/profile']);
  }
}

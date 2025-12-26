import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth } from './auth';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady();

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.whenReady();

  if (!auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/today']);
  return false;
};

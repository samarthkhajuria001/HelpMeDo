import { Routes } from '@angular/router';
import { Shell } from './shared/layout/shell';
import { authGuard, guestGuard } from './core/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.Login),
    canActivate: [guestGuard]
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'today', pathMatch: 'full' },
      {
        path: 'today',
        loadComponent: () => import('./features/today/today').then(m => m.Today)
      },
      {
        path: 'week',
        loadComponent: () => import('./features/week/week').then(m => m.Week)
      },
      {
        path: 'someday',
        loadComponent: () => import('./features/someday/someday').then(m => m.Someday)
      }
    ]
  }
];

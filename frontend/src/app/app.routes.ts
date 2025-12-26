import { Routes } from '@angular/router';
import { Shell } from './shared/layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
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

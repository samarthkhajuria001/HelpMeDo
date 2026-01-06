import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User, UserSettingsUpdate } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  user = signal<User | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  async loadUser(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const user = await this.http.get<User>(`${this.apiUrl}/me`).toPromise();
      this.user.set(user || null);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load user');
      this.user.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async updateSettings(data: UserSettingsUpdate): Promise<User | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const user = await this.http.patch<User>(`${this.apiUrl}/me`, data).toPromise();
      this.user.set(user || null);
      return user || null;
    } catch (err: any) {
      this.error.set(err.message || 'Failed to update settings');
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  getInitials(): string {
    const user = this.user();
    if (!user?.name) return '?';
    const parts = user.name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
}

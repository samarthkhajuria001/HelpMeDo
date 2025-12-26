import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private http = inject(HttpClient);
  private router = inject(Router);

  private userSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(true);

  user = this.userSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  isAuthenticated = computed(() => this.userSignal() !== null);

  private readonly TOKEN_KEY = 'access_token';

  constructor() {
    this.checkAuth();
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  async checkAuth(): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      this.loadingSignal.set(false);
      return false;
    }

    try {
      const user = await this.http.get<User>(
        `${environment.apiUrl}/auth/me`
      ).toPromise();
      this.userSignal.set(user ?? null);
      this.loadingSignal.set(false);
      return true;
    } catch {
      this.clearToken();
      this.userSignal.set(null);
      this.loadingSignal.set(false);
      return false;
    }
  }

  async loginWithGoogle(credential: string): Promise<boolean> {
    try {
      const response = await this.http.post<AuthResponse>(
        `${environment.apiUrl}/auth/google`,
        { credential }
      ).toPromise();

      if (response?.access_token) {
        this.setToken(response.access_token);
        await this.checkAuth();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.http.post(`${environment.apiUrl}/auth/logout`, {}).toPromise();
    } catch {
      // Ignore errors on logout
    }
    this.clearToken();
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }
}

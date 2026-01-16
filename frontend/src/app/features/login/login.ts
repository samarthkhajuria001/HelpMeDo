import { Component, AfterViewInit, ElementRef, ViewChild, inject, signal, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import lottie from 'lottie-web';
import { Auth } from '../../core/auth';
import { environment } from '../../../environments/environment';
import { OnboardingModal } from '../../shared/components/onboarding-modal/onboarding-modal';

declare const google: any;

const ONBOARDING_SEEN_KEY = 'helpme_onboarding_seen_guest';

@Component({
  selector: 'app-login',
  imports: [CommonModule, OnboardingModal],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit, OnInit {
  @ViewChild('lottieContainer') lottieContainer!: ElementRef;
  @ViewChild('googleButtonContainer') googleButtonContainer!: ElementRef;

  private auth = inject(Auth);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  isLoading = signal(false);
  errorMessage = signal('');
  showOnboarding = signal(false);

  ngOnInit() {
    this.checkOnboarding();
  }

  private checkOnboarding() {
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (!seen) {
      setTimeout(() => {
        this.showOnboarding.set(true);
      }, 800);
    }
  }

  onOnboardingComplete() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    this.showOnboarding.set(false);
  }

  ngAfterViewInit() {
    this.initLottie();
    this.initGoogleSignIn();
  }

  private initLottie() {
    lottie.loadAnimation({
      container: this.lottieContainer.nativeElement,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'girl-studying.json'
    });
  }

  private initGoogleSignIn() {
    if (typeof google === 'undefined') {
      setTimeout(() => this.initGoogleSignIn(), 100);
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleGoogleResponse(response)
    });

    google.accounts.id.renderButton(
      this.googleButtonContainer.nativeElement,
      {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 320
      }
    );
  }

  private async handleGoogleResponse(response: any) {
    this.ngZone.run(async () => {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const success = await this.auth.loginWithGoogle(response.credential);

      if (success) {
        this.router.navigate(['/today']);
      } else {
        this.errorMessage.set('Login failed. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
}

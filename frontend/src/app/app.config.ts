import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler, Injectable } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import * as Sentry from '@sentry/browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth-interceptor';
import { environment } from '../environments/environment';

@Injectable()
class SentryErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    Sentry.captureException(error);
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Sentry error handler (only if configured)
    ...(environment.sentryDsn ? [
      { provide: ErrorHandler, useClass: SentryErrorHandler }
    ] : [])
  ]
};

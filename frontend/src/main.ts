import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// Initialize Sentry if configured
if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

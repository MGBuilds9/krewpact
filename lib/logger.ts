/* eslint-disable no-console */
/**
 * Structured logger for KrewPact.
 *
 * - Production: JSON lines to stdout (compatible with Vercel log drains, Sentry)
 * - Development: human-readable colored output via console
 *
 * The `error` method also reports to Sentry when initialized.
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';

function formatJsonLine(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): string {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (isProduction) {
    const line = formatJsonLine(level, message, context);
    switch (level) {
      case 'error':
        console.error(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      default:
        console.log(line);
    }
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}${ctx}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${ctx}`);
        break;
      case 'debug':
        console.debug(`${prefix} ${message}${ctx}`);
        break;
      default:
        console.log(`${prefix} ${message}${ctx}`);
    }
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    log('debug', message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context);
  },

  error(message: string, context?: Record<string, unknown>): void {
    log('error', message, context);

    // Report to Sentry if initialized
    const error = context?.error;
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { ...context, message },
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: context,
      });
    }
  },
};

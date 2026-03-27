/* eslint-disable no-console */
/**
 * Structured logger for KrewPact.
 *
 * - Production: JSON lines to stdout (compatible with Vercel log drains, Sentry)
 * - Development: human-readable colored output via console
 * - Auto-injects request context (requestId, route, userId) when available
 * - Respects LOG_LEVEL env var (default: 'info' in prod, 'debug' in dev)
 *
 * The `error` method also reports to Sentry when initialized.
 */

import * as Sentry from '@sentry/nextjs';

import { getRequestContext } from '@/lib/request-context';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(baseContext: Record<string, unknown>): Logger;
}

const isProduction = process.env.NODE_ENV === 'production';

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || (isProduction ? 'info' : 'debug');
const minPriority = LEVEL_PRIORITY[configuredLevel] ?? 1;

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

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  baseContext?: Record<string, unknown>,
): void {
  if (LEVEL_PRIORITY[level] < minPriority) return;

  // Auto-inject request context when available
  const reqCtx = getRequestContext();
  const merged: Record<string, unknown> = {
    ...(reqCtx ? { requestId: reqCtx.requestId, route: reqCtx.route, userId: reqCtx.userId } : {}),
    ...baseContext,
    ...context,
  };

  if (isProduction) {
    const line = formatJsonLine(level, message, merged);
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
    const ctx = Object.keys(merged).length > 0 ? ` ${JSON.stringify(merged)}` : '';
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

function createLogger(baseContext?: Record<string, unknown>): Logger {
  return {
    debug(message: string, context?: Record<string, unknown>): void {
      log('debug', message, context, baseContext);
    },

    info(message: string, context?: Record<string, unknown>): void {
      log('info', message, context, baseContext);
    },

    warn(message: string, context?: Record<string, unknown>): void {
      log('warn', message, context, baseContext);
    },

    error(message: string, context?: Record<string, unknown>): void {
      log('error', message, context, baseContext);

      const error = context?.error;
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: { ...baseContext, ...context, message },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { ...baseContext, ...context },
        });
      }
    },

    child(childContext: Record<string, unknown>): Logger {
      return createLogger({ ...baseContext, ...childContext });
    },
  };
}

export type { Logger };
export const logger = createLogger();

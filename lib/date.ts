/**
 * Centralized date/time formatting for KrewPact.
 * All dates display in Eastern Time (America/Toronto) with Canadian locale.
 */

export const APP_TIMEZONE = 'America/Toronto';
export const APP_LOCALE = 'en-CA';

/** Format a date string or Date as a localized date (e.g., "2026-03-12") */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options });
}

/** Format a date string or Date as a localized date + time */
export function formatDateTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options });
}

/** Format a date string or Date as a localized time (e.g., "2:30 p.m.") */
export function formatTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(APP_LOCALE, { timeZone: APP_TIMEZONE, ...options });
}

/** Format a date as short month + day (e.g., "Mar 12") */
export function formatShortDate(date: string | Date): string {
  return formatDate(date, { month: 'short', day: 'numeric' });
}

/** Format a date as month + year (e.g., "Mar 2026") */
export function formatMonthYear(date: string | Date): string {
  return formatDate(date, { month: 'short', year: 'numeric' });
}

/** Format currency in CAD */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(APP_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format currency without decimals */
export function formatCurrencyShort(amount: number): string {
  return `$${amount.toLocaleString(APP_LOCALE)}`;
}

/** Format currency abbreviated (e.g., "$1.2M", "$50K", "$500") */
export function formatCurrencyAbbrev(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString(APP_LOCALE)}`;
}

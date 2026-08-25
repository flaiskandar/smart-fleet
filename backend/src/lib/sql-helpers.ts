import { getDbType } from './db.js';

export function now(): string {
  return getDbType() === 'sqlite' ? "datetime('now')" : 'NOW()';
}

export function timeBucket(interval: string, col: string): string {
  if (getDbType() === 'sqlite') {
    const unit = interval.includes('hour') ? '%Y-%m-%d %H:00:00'
               : interval.includes('min') ? '%Y-%m-%d %H:%M:00'
               : interval.includes('day') ? '%Y-%m-%d'
               : '%Y-%m-%d %H:%M:00';
    return `strftime('${unit}', ${col})`;
  }
  return `time_bucket('${interval}', ${col})`;
}

export function dateTrunc(unit: string, col: string): string {
  if (getDbType() === 'sqlite') {
    const fmt = unit === 'month' ? '%Y-%m-01'
              : unit === 'day' ? '%Y-%m-%d'
              : unit === 'hour' ? '%Y-%m-%d %H:00:00'
              : '%Y-%m-%d';
    return `strftime('${fmt}', ${col})`;
  }
  return `date_trunc('${unit}', ${col})`;
}

export function epochDiff(endCol: string, startCol: string): string {
  if (getDbType() === 'sqlite') {
    return `(julianday(${endCol}) - julianday(${startCol})) * 86400`;
  }
  return `EXTRACT(EPOCH FROM (${endCol} - ${startCol}))`;
}

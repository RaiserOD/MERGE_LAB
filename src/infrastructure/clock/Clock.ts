import type { Clock } from "@domain/time/Clock";

/**
 * The wall-clock adapter for the `Clock` port. The interface lives in
 * `@domain/time/Clock`; it is re-exported here so existing infrastructure
 * imports keep resolving.
 */
export type { Clock };

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

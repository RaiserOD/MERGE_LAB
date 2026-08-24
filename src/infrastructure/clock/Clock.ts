/** Time must be injectable (A8) — domain/systems never call Date.now() directly. */
export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

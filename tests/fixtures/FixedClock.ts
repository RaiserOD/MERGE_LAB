import type { Clock } from "@infrastructure/clock/Clock";

export class FixedClock implements Clock {
  constructor(private time: number = 0) {}

  now(): number {
    return this.time;
  }

  advance(deltaMs: number): void {
    this.time += deltaMs;
  }
}

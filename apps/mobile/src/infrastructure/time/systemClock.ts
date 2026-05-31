import type { Clock } from '@application/ports';

// SystemClock provides wall-clock time for production use cases.
export class SystemClock implements Clock {
  // now returns the current device time.
  now(): Date {
    return new Date();
  }
}

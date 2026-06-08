import { vi } from 'vitest';

export const FIXED_SALE_NOW_MS = Date.UTC(2026, 5, 8, 12, 0, 0);

export function useFakeSaleTime(): void {
  vi.useFakeTimers({
    now: FIXED_SALE_NOW_MS,
    toFake: ['Date'],
  });
}

export function restoreRealTime(): void {
  vi.useRealTimers();
}

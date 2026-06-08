import type { SaleStatus } from '@flash-sale/shared';

export function getSaleStatus(
  now: number,
  startAt: number,
  endAt: number,
  stockRemaining: number,
): SaleStatus {
  if (stockRemaining <= 0) {
    return 'sold_out';
  }

  if (now < startAt) {
    return 'upcoming';
  }

  if (now >= endAt) {
    return 'ended';
  }

  return 'active';
}

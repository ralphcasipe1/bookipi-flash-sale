import type { SaleStatus } from '@flash-sale/shared';

const PURCHASE_RESULT_CODES = [
  'success',
  'already_purchased',
  'sold_out',
  'sale_not_active',
] as const;

export type PurchaseResultCode = (typeof PURCHASE_RESULT_CODES)[number];

export type PurchaseResult =
  | { result: 'success' }
  | { result: 'already_purchased' }
  | { result: 'sold_out' }
  | { result: 'sale_not_active'; saleStatus: 'upcoming' | 'ended' };

export function isPurchaseResultCode(value: string): value is PurchaseResultCode {
  return (PURCHASE_RESULT_CODES as readonly string[]).includes(value);
}

export function purchaseBlockedBySaleStatus(
  status: SaleStatus,
): Extract<PurchaseResult, { result: 'sold_out' | 'sale_not_active' }> | null {
  if (status === 'sold_out') {
    return { result: 'sold_out' };
  }

  if (status === 'upcoming') {
    return { result: 'sale_not_active', saleStatus: 'upcoming' };
  }

  if (status === 'ended') {
    return { result: 'sale_not_active', saleStatus: 'ended' };
  }

  return null;
}

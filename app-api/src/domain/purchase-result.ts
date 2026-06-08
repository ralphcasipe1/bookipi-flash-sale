import type { SaleStatus } from '@flash-sale/shared';

export type PurchaseResultCode = 'success' | 'already_purchased' | 'sold_out' | 'sale_not_active';

export type PurchaseResult =
  | { result: 'success' }
  | { result: 'already_purchased' }
  | { result: 'sold_out' }
  | { result: 'sale_not_active'; saleStatus: 'upcoming' | 'ended' };

const PURCHASE_RESULT_CODES: readonly PurchaseResultCode[] = [
  'success',
  'already_purchased',
  'sold_out',
  'sale_not_active',
];

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

import { describe, expect, it } from 'vitest';

import { isPurchaseResultCode, purchaseBlockedBySaleStatus } from './purchase-result.js';

describe('isPurchaseResultCode', () => {
  it('accepts known purchase result codes', () => {
    expect(isPurchaseResultCode('success')).toBe(true);
    expect(isPurchaseResultCode('already_purchased')).toBe(true);
    expect(isPurchaseResultCode('sold_out')).toBe(true);
    expect(isPurchaseResultCode('sale_not_active')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isPurchaseResultCode('pending')).toBe(false);
    expect(isPurchaseResultCode('')).toBe(false);
  });
});

describe('purchaseBlockedBySaleStatus', () => {
  it('allows purchase attempts when the sale is active', () => {
    expect(purchaseBlockedBySaleStatus('active')).toBeNull();
  });

  it('blocks purchase attempts when inventory is sold out', () => {
    expect(purchaseBlockedBySaleStatus('sold_out')).toEqual({ result: 'sold_out' });
  });

  it('blocks purchase attempts before the sale starts', () => {
    expect(purchaseBlockedBySaleStatus('upcoming')).toEqual({
      result: 'sale_not_active',
      saleStatus: 'upcoming',
    });
  });

  it('blocks purchase attempts after the sale ends', () => {
    expect(purchaseBlockedBySaleStatus('ended')).toEqual({
      result: 'sale_not_active',
      saleStatus: 'ended',
    });
  });
});

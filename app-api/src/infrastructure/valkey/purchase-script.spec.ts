import { describe, expect, it } from 'vitest';

import { decodePurchaseScriptResult, mapPurchaseScriptResult } from './purchase-script.js';

describe('purchase-script', () => {
  describe('decodePurchaseScriptResult', () => {
    it('accepts string script results', () => {
      expect(decodePurchaseScriptResult('success')).toBe('success');
    });

    it('accepts buffer script results', () => {
      expect(decodePurchaseScriptResult(Buffer.from('sold_out'))).toBe('sold_out');
    });

    it('rejects unknown script results', () => {
      expect(() => decodePurchaseScriptResult('unknown')).toThrow(
        'Unexpected purchase script result: unknown',
      );
    });
  });

  describe('mapPurchaseScriptResult', () => {
    it('maps success', () => {
      expect(mapPurchaseScriptResult('success')).toEqual({ result: 'success' });
    });

    it('maps already_purchased', () => {
      expect(mapPurchaseScriptResult('already_purchased')).toEqual({
        result: 'already_purchased',
      });
    });

    it('maps sold_out', () => {
      expect(mapPurchaseScriptResult('sold_out')).toEqual({ result: 'sold_out' });
    });

    it('maps upcoming sale window rejection', () => {
      expect(mapPurchaseScriptResult('sale_not_active_upcoming')).toEqual({
        result: 'sale_not_active',
        saleStatus: 'upcoming',
      });
    });

    it('maps ended sale window rejection', () => {
      expect(mapPurchaseScriptResult('sale_not_active_ended')).toEqual({
        result: 'sale_not_active',
        saleStatus: 'ended',
      });
    });
  });
});

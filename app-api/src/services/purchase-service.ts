import type { PurchaseLookupResponse, SaleStatusResponse } from '@flash-sale/shared';

import type { PurchaseResult } from '../domain/purchase-result.js';
import {
  attemptPurchase as attemptPurchaseInValkey,
  getStatus,
  hasUserPurchased,
} from '../infrastructure/valkey/flash-sale-repository.js';

export class PurchaseService {
  async getSaleStatus(nowMs = Date.now()): Promise<SaleStatusResponse> {
    const snapshot = await getStatus(nowMs);

    return {
      status: snapshot.status,
      stockRemaining: snapshot.stockRemaining,
    };
  }

  async attemptPurchase(userId: string, nowMs = Date.now()): Promise<PurchaseResult> {
    return attemptPurchaseInValkey(userId, nowMs);
  }

  async findPurchaseByUserId(userId: string): Promise<PurchaseLookupResponse | null> {
    const purchased = await hasUserPurchased(userId);

    if (!purchased) {
      return null;
    }

    return { result: 'success' };
  }
}

export const purchaseService = new PurchaseService();

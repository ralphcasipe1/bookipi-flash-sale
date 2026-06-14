import type { PurchaseLookupResponse, SaleStatusResponse } from '@flash-sale/shared';
import type { Db } from 'mongodb';

import type { PurchaseResult } from '../domain/purchase-result.js';
import { createOrderEvent } from '../infrastructure/mongodb/order-event.js';
import { publishOrderEvent } from '../infrastructure/mongodb/order-publisher.js';
import { findOrderByUserId } from '../infrastructure/mongodb/order-repository.js';
import {
  attemptPurchase as attemptPurchaseInValkey,
  getStatus,
  hasUserPurchased,
} from '../infrastructure/valkey/flash-sale-repository.js';

type PurchaseServiceOptions = {
  getDb?: () => Db | undefined;
};

export class PurchaseService {
  constructor(private readonly options: PurchaseServiceOptions = {}) {}

  async getSaleStatus(nowMs = Date.now()): Promise<SaleStatusResponse> {
    const snapshot = await getStatus(nowMs);

    return {
      status: snapshot.status,
      stockRemaining: snapshot.stockRemaining,
      initialStock: snapshot.initialStock,
    };
  }

  async attemptPurchase(userId: string, nowMs = Date.now()): Promise<PurchaseResult> {
    const result = await attemptPurchaseInValkey(userId, nowMs);

    if (result.result === 'success') {
      await publishOrderEvent(createOrderEvent(userId, nowMs));
    }

    return result;
  }

  async findPurchaseByUserId(userId: string): Promise<PurchaseLookupResponse | null> {
    const db = this.options.getDb?.();

    if (db) {
      const order = await findOrderByUserId(db, userId);
      if (order) {
        return { result: 'success' };
      }
    }

    const purchased = await hasUserPurchased(userId);

    if (!purchased) {
      return null;
    }

    return { result: 'success' };
  }
}

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  attemptPurchase,
  type FlashSaleConfig,
  getStatus,
  initSale,
} from '../src/infrastructure/valkey/flash-sale-repository.js';
import { releasePurchaseScript } from '../src/infrastructure/valkey/purchase-script.js';
import { closeValkeyClient } from '../src/infrastructure/valkey/valkey-client.js';
import { randomUserIds } from './helpers/test-data.js';

const valkeyDescribe = process.env.VALKEY_URL ? describe : describe.skip;

function activeSaleConfig(initialStock: number, nowMs: number): FlashSaleConfig {
  return {
    startAt: nowMs - 60_000,
    endAt: nowMs + 60_000,
    initialStock,
  };
}

valkeyDescribe('flash sale purchase concurrency', () => {
  const nowMs = Date.UTC(2026, 5, 8, 12, 0, 0);
  const initialStock = 5;
  const attemptCount = 50;

  beforeEach(async () => {
    await initSale(activeSaleConfig(initialStock, nowMs));
  });

  afterAll(() => {
    releasePurchaseScript();
    closeValkeyClient();
  });

  it('allows exactly initialStock successes under parallel load', async () => {
    const userIds = randomUserIds(attemptCount);

    const results = await Promise.all(userIds.map((userId) => attemptPurchase(userId, nowMs)));

    const successes = results.filter((result) => result.result === 'success');
    const soldOut = results.filter((result) => result.result === 'sold_out');
    const status = await getStatus(nowMs);

    expect(successes).toHaveLength(initialStock);
    expect(soldOut).toHaveLength(attemptCount - initialStock);
    expect(
      results.every((result) => result.result === 'success' || result.result === 'sold_out'),
    ).toBe(true);
    expect(status.stockRemaining).toBe(0);
    expect(status.status).toBe('sold_out');
  });
});

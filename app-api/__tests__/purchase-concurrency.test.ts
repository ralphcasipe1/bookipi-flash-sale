import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  attemptPurchase,
  getStatus,
  initSale,
} from '../src/infrastructure/valkey/flash-sale-repository.js';
import { releasePurchaseScript } from '../src/infrastructure/valkey/purchase-script.js';
import { closeValkeyClient } from '../src/infrastructure/valkey/valkey-client.js';
import { restoreRealTime, useFakeSaleTime } from './helpers/fake-time.js';
import { activeSaleConfig } from './helpers/sale-fixtures.js';
import { randomUserIds } from './helpers/test-data.js';

const valkeyDescribe = process.env.VALKEY_URL ? describe : describe.skip;

valkeyDescribe('flash sale purchase concurrency', () => {
  const initialStock = 5;
  const attemptCount = 50;

  beforeEach(async () => {
    useFakeSaleTime();
    await initSale(activeSaleConfig(initialStock));
  });

  afterEach(() => {
    restoreRealTime();
  });

  afterAll(() => {
    releasePurchaseScript();
    closeValkeyClient();
  });

  it('allows exactly initialStock successes under parallel load', async () => {
    const userIds = randomUserIds(attemptCount);

    const results = await Promise.all(userIds.map((userId) => attemptPurchase(userId)));

    const successes = results.filter((result) => result.result === 'success');
    const soldOut = results.filter((result) => result.result === 'sold_out');
    const status = await getStatus();

    expect(successes).toHaveLength(initialStock);
    expect(soldOut).toHaveLength(attemptCount - initialStock);
    expect(
      results.every((result) => result.result === 'success' || result.result === 'sold_out'),
    ).toBe(true);
    expect(status.stockRemaining).toBe(0);
    expect(status.status).toBe('sold_out');
  });
});

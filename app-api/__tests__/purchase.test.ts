import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  attemptPurchase,
  getStatus,
  initSale,
} from '../src/infrastructure/valkey/flash-sale-repository.js';
import { releasePurchaseScript } from '../src/infrastructure/valkey/purchase-script.js';
import { closeValkeyClient } from '../src/infrastructure/valkey/valkey-client.js';
import { FIXED_SALE_NOW_MS, restoreRealTime, useFakeSaleTime } from './helpers/fake-time.js';
import { activeSaleConfig } from './helpers/sale-fixtures.js';
import { randomUserId } from './helpers/test-data.js';

const valkeyDescribe = process.env.VALKEY_URL ? describe : describe.skip;

valkeyDescribe('flash sale purchases', () => {
  beforeEach(async () => {
    useFakeSaleTime();
    await initSale(activeSaleConfig(10));
  });

  afterEach(() => {
    restoreRealTime();
  });

  afterAll(() => {
    releasePurchaseScript();
    closeValkeyClient();
  });

  it('reports an active sale with full stock after init', async () => {
    const status = await getStatus();

    expect(status).toMatchObject({
      status: 'active',
      stockRemaining: 10,
      initialStock: 10,
    });
  });

  it('allows a successful purchase and decrements stock', async () => {
    const userId = randomUserId();

    const result = await attemptPurchase(userId);
    const status = await getStatus();

    expect(result).toEqual({ result: 'success' });
    expect(status.stockRemaining).toBe(9);
    expect(status.status).toBe('active');
  });

  it('rejects a duplicate purchase from the same user', async () => {
    const userId = randomUserId();

    const firstAttempt = await attemptPurchase(userId);
    const secondAttempt = await attemptPurchase(userId);
    const status = await getStatus();

    expect(firstAttempt).toEqual({ result: 'success' });
    expect(secondAttempt).toEqual({ result: 'already_purchased' });
    expect(status.stockRemaining).toBe(9);
  });

  it('rejects purchases when stock is exhausted', async () => {
    await initSale(activeSaleConfig(1));

    const firstBuyer = randomUserId();
    const secondBuyer = randomUserId();

    const firstAttempt = await attemptPurchase(firstBuyer);
    const secondAttempt = await attemptPurchase(secondBuyer);
    const status = await getStatus();

    expect(firstAttempt).toEqual({ result: 'success' });
    expect(secondAttempt).toEqual({ result: 'sold_out' });
    expect(status.stockRemaining).toBe(0);
    expect(status.status).toBe('sold_out');
  });

  it('rejects purchases before the sale starts', async () => {
    await initSale({
      startAt: FIXED_SALE_NOW_MS + 60_000,
      endAt: FIXED_SALE_NOW_MS + 120_000,
      initialStock: 10,
    });

    const result = await attemptPurchase(randomUserId());
    const status = await getStatus();

    expect(result).toEqual({ result: 'sale_not_active', saleStatus: 'upcoming' });
    expect(status.status).toBe('upcoming');
    expect(status.stockRemaining).toBe(10);
  });

  it('rejects purchases after the sale ends', async () => {
    await initSale({
      startAt: FIXED_SALE_NOW_MS - 120_000,
      endAt: FIXED_SALE_NOW_MS - 60_000,
      initialStock: 10,
    });

    const result = await attemptPurchase(randomUserId());
    const status = await getStatus();

    expect(result).toEqual({ result: 'sale_not_active', saleStatus: 'ended' });
    expect(status.status).toBe('ended');
    expect(status.stockRemaining).toBe(10);
  });
});

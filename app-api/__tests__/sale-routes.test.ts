import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { initSale } from '../src/infrastructure/valkey/flash-sale-repository.js';
import { releasePurchaseScript } from '../src/infrastructure/valkey/purchase-script.js';
import { closeValkeyClient } from '../src/infrastructure/valkey/valkey-client.js';
import { FIXED_SALE_NOW_MS, restoreRealTime, useFakeSaleTime } from './helpers/fake-time.js';
import { activeSaleConfig } from './helpers/sale-fixtures.js';
import { randomUserId } from './helpers/test-data.js';

const valkeyDescribe = process.env.VALKEY_URL ? describe : describe.skip;

valkeyDescribe('sale routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    useFakeSaleTime();
    await initSale(activeSaleConfig(10));
  });

  afterEach(() => {
    restoreRealTime();
  });

  afterAll(async () => {
    await app.close();
    releasePurchaseScript();
    closeValkeyClient();
  });

  it('GET /sale/status returns active sale with remaining stock', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/sale/status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'active',
      stockRemaining: 10,
    });
  });

  it('POST /sale/purchase succeeds and decrements stock', async () => {
    const userId = randomUserId();

    const purchaseResponse = await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId },
    });
    const statusResponse = await app.inject({
      method: 'GET',
      url: '/sale/status',
    });

    expect(purchaseResponse.statusCode).toBe(200);
    expect(purchaseResponse.json()).toEqual({ result: 'success' });
    expect(statusResponse.json()).toEqual({
      status: 'active',
      stockRemaining: 9,
    });
  });

  it('POST /sale/purchase rejects duplicate buyers with 409', async () => {
    const userId = randomUserId();

    await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ result: 'already_purchased' });
  });

  it('POST /sale/purchase returns sold_out with 409 when stock is exhausted', async () => {
    await initSale(activeSaleConfig(1));

    await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId: randomUserId() },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId: randomUserId() },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ result: 'sold_out' });
  });

  it('POST /sale/purchase returns 403 when sale has not started', async () => {
    await initSale({
      startAt: FIXED_SALE_NOW_MS + 60_000,
      endAt: FIXED_SALE_NOW_MS + 120_000,
      initialStock: 10,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId: randomUserId() },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ result: 'sale_not_active', saleStatus: 'upcoming' });
  });

  it('POST /sale/purchase returns 403 when sale has ended', async () => {
    await initSale({
      startAt: FIXED_SALE_NOW_MS - 120_000,
      endAt: FIXED_SALE_NOW_MS - 60_000,
      initialStock: 10,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId: randomUserId() },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ result: 'sale_not_active', saleStatus: 'ended' });
  });

  it('GET /sale/purchase/:userId returns prior purchase after success', async () => {
    const userId = randomUserId();

    await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/sale/purchase/${encodeURIComponent(userId)}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ result: 'success' });
  });

  it('GET /sale/purchase/:userId returns 404 when user has not purchased', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/sale/purchase/${encodeURIComponent(randomUserId())}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'Purchase not found' });
  });

  it('POST /sale/purchase returns 400 for invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});

import type { FastifyInstance } from 'fastify';
import type { Db } from 'mongodb';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { createOrderEvent } from '../src/infrastructure/mongodb/order-event.js';
import { publishOrderEvent } from '../src/infrastructure/mongodb/order-publisher.js';
import {
  clearOrders,
  findOrderByUserId,
  saveOrder,
} from '../src/infrastructure/mongodb/order-repository.js';
import { initSale } from '../src/infrastructure/valkey/flash-sale-repository.js';
import { releasePurchaseScript } from '../src/infrastructure/valkey/purchase-script.js';
import { closeValkeyClient } from '../src/infrastructure/valkey/valkey-client.js';
import { restoreRealTime, useFakeSaleTime } from './helpers/fake-time.js';
import { activeSaleConfig } from './helpers/sale-fixtures.js';
import { randomUserId } from './helpers/test-data.js';

const ordersDescribe = process.env.VALKEY_URL && process.env.MONGODB_URL ? describe : describe.skip;

async function pollForOrder(
  db: Db,
  userId: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<NonNullable<Awaited<ReturnType<typeof findOrderByUserId>>>> {
  const timeoutMs = options.timeoutMs ?? 3_000;
  const intervalMs = options.intervalMs ?? 50;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const order = await findOrderByUserId(db, userId);
    if (order) {
      return order;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for order for userId=${userId}`);
}

ordersDescribe('order persistence', () => {
  let app: FastifyInstance;
  let db: Db;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    if (!app.mongo?.db) {
      throw new Error('MongoDB is not configured — set MONGODB_URL');
    }

    db = app.mongo.db;
  });

  beforeEach(async () => {
    useFakeSaleTime();
    await initSale(activeSaleConfig(10));
    await clearOrders(db);
  });

  afterEach(() => {
    restoreRealTime();
  });

  afterAll(async () => {
    await app.close();
    releasePurchaseScript();
    closeValkeyClient();
  });

  it('persists successful purchases to MongoDB asynchronously', async () => {
    const userId = randomUserId();

    const purchaseResponse = await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId },
    });

    expect(purchaseResponse.statusCode).toBe(200);

    const order = await pollForOrder(db, userId);

    expect(order).toMatchObject({
      userId,
      purchasedAt: expect.any(Number),
      idempotencyKey: userId,
    });
  });

  it('GET /sale/purchase/:userId reads persisted orders from MongoDB', async () => {
    const userId = randomUserId();

    await app.inject({
      method: 'POST',
      url: '/sale/purchase',
      payload: { userId },
    });

    await pollForOrder(db, userId);

    const response = await app.inject({
      method: 'GET',
      url: `/sale/purchase/${encodeURIComponent(userId)}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ result: 'success' });
  });

  it('treats duplicate order events as idempotent via unique userId index', async () => {
    const userId = randomUserId();
    const event = createOrderEvent(userId, Date.now());

    expect(await saveOrder(db, event)).toBe('inserted');
    expect(await saveOrder(db, event)).toBe('duplicate');
  });

  it('treats duplicate pub/sub publishes as idempotent', async () => {
    const userId = randomUserId();
    const event = createOrderEvent(userId, Date.now());

    await publishOrderEvent(event);
    await publishOrderEvent(event);

    const order = await pollForOrder(db, userId);
    expect(order.userId).toBe(userId);

    const orders = await db.collection('orders').find({ userId }).toArray();
    expect(orders).toHaveLength(1);
  });
});

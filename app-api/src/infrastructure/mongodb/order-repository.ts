import type { Db } from 'mongodb';
import { MongoServerError } from 'mongodb';

import { ORDERS_COLLECTION, type OrderEvent } from './order-event.js';

export type SaveOrderResult = 'inserted' | 'duplicate';

const MONGODB_DUPLICATE_KEY_ERROR_CODE = 11000;

export async function ensureOrderIndexes(db: Db): Promise<void> {
  await db.collection(ORDERS_COLLECTION).createIndex({ userId: 1 }, { unique: true });
}

export async function saveOrder(db: Db, order: OrderEvent): Promise<SaveOrderResult> {
  try {
    await db.collection(ORDERS_COLLECTION).insertOne(order);
    return 'inserted';
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return 'duplicate';
    }

    throw error;
  }
}

export async function findOrderByUserId(db: Db, userId: string): Promise<OrderEvent | null> {
  const order = await db.collection<OrderEvent>(ORDERS_COLLECTION).findOne({ userId });
  return order;
}

export async function clearOrders(db: Db): Promise<void> {
  await db.collection(ORDERS_COLLECTION).deleteMany({});
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === MONGODB_DUPLICATE_KEY_ERROR_CODE;
}

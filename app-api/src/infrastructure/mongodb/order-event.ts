import { type Order, orderSchema } from '@flash-sale/shared';

export const ORDER_CHANNEL = 'flash:orders';
export const ORDERS_COLLECTION = 'orders';

export type OrderEvent = Order;

export function createOrderEvent(userId: string, purchasedAt: number): OrderEvent {
  return {
    userId,
    purchasedAt,
    idempotencyKey: userId,
  };
}

export function serializeOrderEvent(event: OrderEvent): string {
  return JSON.stringify(event);
}

export function parseOrderEventPayload(raw: string): OrderEvent {
  const parsed: unknown = JSON.parse(raw);
  return orderSchema.parse(parsed);
}

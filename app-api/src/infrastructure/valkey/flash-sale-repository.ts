import type { SaleStatus } from '@flash-sale/shared';
import type { GlideString } from '@valkey/valkey-glide';

import type { PurchaseResult } from '../../domain/purchase-result.js';
import { getSaleStatus } from '../../domain/sale-window.js';
import { executePurchaseScript, FLASH_SALE_KEYS } from './purchase-script.js';
import { getValkeyClient } from './valkey-client.js';

export type FlashSaleConfig = {
  startAt: number;
  endAt: number;
  initialStock: number;
};

export type SaleSnapshot = {
  status: SaleStatus;
  stockRemaining: number;
  startAt: number;
  endAt: number;
  initialStock: number;
};

export async function initSale(config: FlashSaleConfig): Promise<void> {
  const client = await getValkeyClient();

  await client.set(FLASH_SALE_KEYS.config, JSON.stringify(config));
  await client.set(FLASH_SALE_KEYS.stock, String(config.initialStock));
  await client.del([FLASH_SALE_KEYS.purchasedUsers]);
}

export async function getStatus(nowMs = Date.now()): Promise<SaleSnapshot> {
  const client = await getValkeyClient();
  const [configRaw, stockRaw] = await Promise.all([
    client.get(FLASH_SALE_KEYS.config),
    client.get(FLASH_SALE_KEYS.stock),
  ]);

  if (!configRaw) {
    throw new Error('Flash sale is not initialized');
  }

  const config = parseFlashSaleConfig(decodeGlideString(configRaw));
  const stockRemaining = parseStockRemaining(stockRaw);

  return {
    status: getSaleStatus(nowMs, config.startAt, config.endAt, stockRemaining),
    stockRemaining,
    startAt: config.startAt,
    endAt: config.endAt,
    initialStock: config.initialStock,
  };
}

export async function attemptPurchase(userId: string, nowMs = Date.now()): Promise<PurchaseResult> {
  const client = await getValkeyClient();
  return executePurchaseScript(client, userId, nowMs);
}

export async function hasUserPurchased(userId: string): Promise<boolean> {
  const client = await getValkeyClient();
  return client.sismember(FLASH_SALE_KEYS.purchasedUsers, userId);
}

function parseFlashSaleConfig(raw: string): FlashSaleConfig {
  const parsed: unknown = JSON.parse(raw);

  if (!isFlashSaleConfig(parsed)) {
    throw new Error('Invalid flash sale config stored in Valkey');
  }

  return parsed;
}

function isFlashSaleConfig(value: unknown): value is FlashSaleConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    typeof config.startAt === 'number' &&
    typeof config.endAt === 'number' &&
    typeof config.initialStock === 'number'
  );
}

function parseStockRemaining(stockRaw: GlideString | null): number {
  if (!stockRaw) {
    return 0;
  }

  const stock = Number(decodeGlideString(stockRaw));
  if (!Number.isFinite(stock)) {
    throw new Error('Invalid stock value stored in Valkey');
  }

  return stock;
}

function decodeGlideString(value: GlideString): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }

  throw new Error(`Unexpected Valkey string value type: ${typeof value}`);
}

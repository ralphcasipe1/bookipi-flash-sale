import type { FlashSaleConfig } from '../../src/infrastructure/valkey/flash-sale-repository';
import { FIXED_SALE_NOW_MS } from './fake-time';

export function activeSaleConfig(initialStock: number, nowMs = FIXED_SALE_NOW_MS): FlashSaleConfig {
  return {
    startAt: nowMs - 60_000,
    endAt: nowMs + 60_000,
    initialStock,
  };
}

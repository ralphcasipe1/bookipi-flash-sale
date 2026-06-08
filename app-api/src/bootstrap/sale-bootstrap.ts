import { initSale } from '../infrastructure/valkey/flash-sale-repository.js';

export async function bootstrapSaleFromEnv(): Promise<void> {
  if (!process.env.VALKEY_URL) {
    return;
  }

  const { SALE_START, SALE_END, INITIAL_STOCK } = process.env;

  if (!SALE_START || !SALE_END || !INITIAL_STOCK) {
    return;
  }

  const initialStock = Number(INITIAL_STOCK);

  if (!Number.isInteger(initialStock) || initialStock < 0) {
    throw new Error('INITIAL_STOCK must be a non-negative integer');
  }

  await initSale({
    startAt: Date.parse(SALE_START),
    endAt: Date.parse(SALE_END),
    initialStock,
  });
}

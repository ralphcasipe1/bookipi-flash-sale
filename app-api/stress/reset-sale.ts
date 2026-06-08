import { initSale } from '../src/infrastructure/valkey/flash-sale-repository.js';
import { closeValkeyClient } from '../src/infrastructure/valkey/valkey-client.js';

const initialStock = Number(process.env.INITIAL_STOCK ?? 100);
const now = Date.now();

await initSale({
  startAt: now - 60_000,
  endAt: now + 3_600_000,
  initialStock,
});

closeValkeyClient();

console.log(
  `Sale reset: ${initialStock} items in stock, active until ${new Date(now + 3_600_000).toISOString()}`,
);

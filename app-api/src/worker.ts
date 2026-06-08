import { MongoClient } from 'mongodb';

import { ensureOrderIndexes } from './infrastructure/mongodb/order-repository.js';
import { startOrderSubscriber } from './infrastructure/mongodb/order-subscriber.js';

const mongoUrl = process.env.MONGODB_URL ?? 'mongodb://localhost:27017/flash_sale';

async function main(): Promise<void> {
  const mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();

  const db = mongoClient.db();
  await ensureOrderIndexes(db);

  const subscriber = await startOrderSubscriber(db);
  console.log('Worker listening for flash:orders events');

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down order worker`);
    subscriber.close();
    await mongoClient.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error: unknown) => {
  console.error('Worker failed to start', error);
  process.exit(1);
});

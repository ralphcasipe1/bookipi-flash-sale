import fastifyMongo from '@fastify/mongodb';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import type { HealthResponse } from '@flash-sale/shared';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { bootstrapSaleFromEnv } from './bootstrap/sale-bootstrap.js';
import { ensureOrderIndexes } from './infrastructure/mongodb/order-repository.js';
import {
  type OrderSubscriberHandle,
  startOrderSubscriber,
} from './infrastructure/mongodb/order-subscriber.js';
import { saleRoutes } from './routes/sale-routes.js';

function shouldStartInProcessOrderWorker(): boolean {
  return process.env.ORDER_WORKER_IN_PROCESS !== 'false';
}

export async function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const mongoUrl = process.env.MONGODB_URL;
  if (mongoUrl) {
    await app.register(fastifyMongo, {
      url: mongoUrl,
      forceClose: true,
    });
  }

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Flash Sale API',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
  });

  app.get<{ Reply: HealthResponse }>('/health', async () => {
    return { status: 'ok' };
  });

  await app.register(saleRoutes);

  let orderSubscriber: OrderSubscriberHandle | null = null;

  app.addHook('onReady', async () => {
    await bootstrapSaleFromEnv();

    if (app.mongo?.db) {
      await ensureOrderIndexes(app.mongo.db);

      if (shouldStartInProcessOrderWorker()) {
        orderSubscriber = await startOrderSubscriber(app.mongo.db);
        app.log.info('In-process order worker subscribed to flash:orders');
      }
    }
  });

  app.addHook('onClose', async () => {
    orderSubscriber?.close();
  });

  return app;
}

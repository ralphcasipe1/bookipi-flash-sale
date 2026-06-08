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
import { saleRoutes } from './routes/sale-routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

  app.addHook('onReady', async () => {
    await bootstrapSaleFromEnv();
  });

  return app;
}

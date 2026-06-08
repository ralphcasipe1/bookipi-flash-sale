import type { HealthResponse } from '@flash-sale/shared';
import Fastify from 'fastify';

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.get<{ Reply: HealthResponse }>('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}

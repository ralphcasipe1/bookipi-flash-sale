import {
  notFoundResponseSchema,
  purchaseLookupResponseSchema,
  purchaseRequestSchema,
  purchaseResultSchema,
  purchaseUserIdParamsSchema,
  saleStatusResponseSchema,
} from '@flash-sale/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { PurchaseService } from '../services/purchase-service.js';

export const saleRoutes: FastifyPluginAsyncZod = async (app) => {
  const purchaseService = new PurchaseService({
    getDb: () => app.mongo?.db,
  });
  app.get(
    '/sale/status',
    {
      schema: {
        response: {
          200: saleStatusResponseSchema,
        },
      },
    },
    async () => purchaseService.getSaleStatus(),
  );

  app.post(
    '/sale/purchase',
    {
      schema: {
        body: purchaseRequestSchema,
        response: {
          200: purchaseResultSchema,
          403: purchaseResultSchema,
          409: purchaseResultSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await purchaseService.attemptPurchase(request.body.userId);

      switch (result.result) {
        case 'success':
          return reply.code(200).send(result);
        case 'sale_not_active':
          return reply.code(403).send(result);
        case 'already_purchased':
        case 'sold_out':
          return reply.code(409).send(result);
      }
    },
  );

  app.get(
    '/sale/purchase/:userId',
    {
      schema: {
        params: purchaseUserIdParamsSchema,
        response: {
          200: purchaseLookupResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const purchase = await purchaseService.findPurchaseByUserId(request.params.userId);

      if (!purchase) {
        return reply.code(404).send({ message: 'Purchase not found' });
      }

      return purchase;
    },
  );
};

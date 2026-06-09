import { z } from 'zod/v4';

export const saleStatusSchema = z.enum(['upcoming', 'active', 'ended', 'sold_out']);

export const saleStatusResponseSchema = z.object({
  status: saleStatusSchema,
  stockRemaining: z.number().int().nonnegative(),
});

export const purchaseRequestSchema = z.object({
  userId: z.string().trim().min(1),
});

export const purchaseResultSchema = z.discriminatedUnion('result', [
  z.object({ result: z.literal('success') }),
  z.object({ result: z.literal('already_purchased') }),
  z.object({ result: z.literal('sold_out') }),
  z.object({
    result: z.literal('sale_not_active'),
    saleStatus: z.enum(['upcoming', 'ended']),
  }),
]);

export const purchaseLookupResponseSchema = z.object({
  result: z.literal('success'),
});

export const purchaseUserIdParamsSchema = z.object({
  userId: z.string().trim().min(1),
});

export const notFoundResponseSchema = z.object({
  message: z.string(),
});

export type SaleStatus = z.infer<typeof saleStatusSchema>;
export type SaleStatusResponse = z.infer<typeof saleStatusResponseSchema>;
export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
export type PurchaseResponse = z.infer<typeof purchaseResultSchema>;
export type PurchaseLookupResponse = z.infer<typeof purchaseLookupResponseSchema>;

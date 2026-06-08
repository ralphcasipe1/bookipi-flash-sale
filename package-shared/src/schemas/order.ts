import { z } from 'zod/v4';

export const orderSchema = z.object({
  userId: z.string().min(1),
  purchasedAt: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(1),
});

export type Order = z.infer<typeof orderSchema>;

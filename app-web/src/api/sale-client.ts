import {
  type PurchaseResponse,
  purchaseResultSchema,
  type SaleStatusResponse,
  saleStatusResponseSchema,
} from '@flash-sale/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid response from server');
  }
}

export async function fetchSaleStatus(): Promise<SaleStatusResponse> {
  const response = await fetch(`${API_BASE}/sale/status`);

  if (!response.ok) {
    throw new Error('Could not load sale status');
  }

  return saleStatusResponseSchema.parse(await readJson(response));
}

export async function attemptPurchase(
  userId: string,
): Promise<{ status: number; body: PurchaseResponse }> {
  const response = await fetch(`${API_BASE}/sale/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  return {
    status: response.status,
    body: purchaseResultSchema.parse(await readJson(response)),
  };
}

export async function hasExistingPurchase(userId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/sale/purchase/${encodeURIComponent(userId)}`);

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error('Could not check purchase history');
  }

  return true;
}

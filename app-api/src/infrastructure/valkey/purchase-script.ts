import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { GlideClient, GlideReturnType } from '@valkey/valkey-glide';
import { Script } from '@valkey/valkey-glide';

import type { PurchaseResult } from '../../domain/purchase-result.js';

export const FLASH_SALE_KEYS = {
  stock: 'flash:sale:stock',
  purchasedUsers: 'flash:sale:purchased_users',
  config: 'flash:sale:config',
} as const;

type PurchaseScriptCode =
  | 'success'
  | 'already_purchased'
  | 'sold_out'
  | 'sale_not_active_upcoming'
  | 'sale_not_active_ended';

const PURCHASE_SCRIPT_CODES: readonly PurchaseScriptCode[] = [
  'success',
  'already_purchased',
  'sold_out',
  'sale_not_active_upcoming',
  'sale_not_active_ended',
];

let purchaseScript: Script | null = null;

function loadPurchaseScriptSource(): string {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const scriptPath = join(currentDirectory, 'purchase.script.lua');
  return readFileSync(scriptPath, 'utf8');
}

function getPurchaseScript(): Script {
  if (!purchaseScript) {
    purchaseScript = new Script(loadPurchaseScriptSource());
  }

  return purchaseScript;
}

export function releasePurchaseScript(): void {
  if (purchaseScript) {
    purchaseScript.release();
    purchaseScript = null;
  }
}

export function decodePurchaseScriptResult(result: GlideReturnType): PurchaseScriptCode {
  const code = decodeGlideString(result);

  if (!isPurchaseScriptCode(code)) {
    throw new Error(`Unexpected purchase script result: ${code}`);
  }

  return code;
}

export function mapPurchaseScriptResult(code: PurchaseScriptCode): PurchaseResult {
  switch (code) {
    case 'success':
      return { result: 'success' };
    case 'already_purchased':
      return { result: 'already_purchased' };
    case 'sold_out':
      return { result: 'sold_out' };
    case 'sale_not_active_upcoming':
      return { result: 'sale_not_active', saleStatus: 'upcoming' };
    case 'sale_not_active_ended':
      return { result: 'sale_not_active', saleStatus: 'ended' };
  }
}

export async function executePurchaseScript(
  client: GlideClient,
  userId: string,
  nowMs: number,
): Promise<PurchaseResult> {
  const scriptResult = await client.invokeScript(getPurchaseScript(), {
    keys: [FLASH_SALE_KEYS.stock, FLASH_SALE_KEYS.purchasedUsers, FLASH_SALE_KEYS.config],
    args: [userId, String(nowMs)],
  });

  const code = decodePurchaseScriptResult(scriptResult);
  return mapPurchaseScriptResult(code);
}

function decodeGlideString(value: GlideReturnType): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }

  throw new Error(`Unexpected purchase script result type: ${typeof value}`);
}

function isPurchaseScriptCode(value: string): value is PurchaseScriptCode {
  return (PURCHASE_SCRIPT_CODES as readonly string[]).includes(value);
}

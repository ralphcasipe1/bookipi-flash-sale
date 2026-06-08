import type { GlideString } from '@valkey/valkey-glide';

import { getValkeyClient } from '../valkey/valkey-client.js';
import { ORDER_CHANNEL, type OrderEvent, serializeOrderEvent } from './order-event.js';

export async function publishOrderEvent(event: OrderEvent): Promise<void> {
  const client = await getValkeyClient();
  await client.publish(serializeOrderEvent(event), ORDER_CHANNEL);
}

export function decodeGlideString(value: GlideString): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }

  throw new Error(`Unexpected Valkey string value type: ${typeof value}`);
}

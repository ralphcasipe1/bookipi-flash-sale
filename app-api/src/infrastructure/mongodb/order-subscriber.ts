import { GlideClient, GlideClientConfiguration, type PubSubMsg } from '@valkey/valkey-glide';
import type { Db } from 'mongodb';

import { parseValkeyUrl } from '../valkey/valkey-client.js';
import { ORDER_CHANNEL, parseOrderEventPayload } from './order-event.js';
import { decodeGlideString } from './order-publisher.js';
import { saveOrder } from './order-repository.js';

const DEFAULT_VALKEY_URL = 'redis://localhost:6379';

export type OrderSubscriberHandle = {
  close: () => void;
};

export async function startOrderSubscriber(db: Db): Promise<OrderSubscriberHandle> {
  const url = process.env.VALKEY_URL ?? DEFAULT_VALKEY_URL;
  const connection = parseValkeyUrl(url);

  const subscriber = await GlideClient.createClient({
    ...connection,
    pubsubSubscriptions: {
      channelsAndPatterns: {
        [GlideClientConfiguration.PubSubChannelModes.Exact]: new Set([ORDER_CHANNEL]),
      },
      callback: (message) => {
        void handleOrderMessage(db, message);
      },
    },
  });

  return {
    close: () => subscriber.close(),
  };
}

async function handleOrderMessage(db: Db, message: PubSubMsg): Promise<void> {
  try {
    const event = parseOrderEventPayload(decodeGlideString(message.message));
    await saveOrder(db, event);
  } catch (error) {
    console.error('Failed to persist order from pub/sub message', error);
  }
}

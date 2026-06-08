import { GlideClient, type GlideClientConfiguration } from '@valkey/valkey-glide';

const DEFAULT_VALKEY_URL = 'redis://localhost:6379';

type ValkeyConnectionOptions = Pick<
  GlideClientConfiguration,
  'addresses' | 'credentials' | 'databaseId' | 'useTLS'
>;

let client: GlideClient | null = null;
let clientPromise: Promise<GlideClient> | null = null;

export function parseValkeyUrl(url: string): ValkeyConnectionOptions {
  const parsed = new URL(url);

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error(`Unsupported Valkey URL protocol: ${parsed.protocol}`);
  }

  const port = parsed.port ? Number(parsed.port) : 6379;
  const databasePath = parsed.pathname.slice(1);

  const options: ValkeyConnectionOptions = {
    addresses: [{ host: parsed.hostname, port }],
    useTLS: parsed.protocol === 'rediss:',
  };

  if (parsed.username !== '' || parsed.password !== '') {
    options.credentials = {
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  }

  if (databasePath !== '') {
    const databaseId = Number(databasePath);
    if (!Number.isInteger(databaseId) || databaseId < 0) {
      throw new Error(`Invalid Valkey database in URL: ${databasePath}`);
    }
    options.databaseId = databaseId;
  }

  return options;
}

async function createValkeyClient(): Promise<GlideClient> {
  const url = process.env.VALKEY_URL ?? DEFAULT_VALKEY_URL;
  const connection = parseValkeyUrl(url);

  return GlideClient.createClient(connection);
}

export function getValkeyClient(): Promise<GlideClient> {
  if (client) {
    return Promise.resolve(client);
  }

  if (!clientPromise) {
    clientPromise = createValkeyClient().then((connectedClient) => {
      client = connectedClient;
      return connectedClient;
    });
  }

  return clientPromise;
}

export function closeValkeyClient(): void {
  if (client) {
    client.close();
    client = null;
  }

  clientPromise = null;
}

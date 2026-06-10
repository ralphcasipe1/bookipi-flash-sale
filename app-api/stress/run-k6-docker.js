import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const k6Script = join(scriptDir, 'purchase.k6.js');
const k6Image = process.env.K6_DOCKER_IMAGE || 'grafana/k6';

function apiUrlForDocker(url) {
  return url.replace(/\/\/(localhost|127\.0\.0\.1)/, '//host.docker.internal');
}

function checkDocker() {
  const result = spawnSync('docker', ['version'], { stdio: 'ignore' });
  if (result.status !== 0) {
    console.error('Docker is required for stress tests.');
    console.error('Install Docker, then run: npm run test:stress -w @flash-sale/api');
    process.exit(1);
  }
}

checkDocker();

const apiUrl = apiUrlForDocker(process.env.API_URL || 'http://localhost:3000');
const env = [
  `API_URL=${apiUrl}`,
  `INITIAL_STOCK=${process.env.INITIAL_STOCK || '100'}`,
  `STRESS_VUS=${process.env.STRESS_VUS || '500'}`,
  `STRESS_ITERATIONS=${process.env.STRESS_ITERATIONS || process.env.STRESS_VUS || '500'}`,
];

const dockerArgs = ['run', '--rm', '-i'];
if (process.platform === 'linux') {
  dockerArgs.push('--add-host=host.docker.internal:host-gateway');
}
for (const entry of env) {
  dockerArgs.push('-e', entry);
}
dockerArgs.push(k6Image, 'run', '-');

const result = spawnSync('docker', dockerArgs, {
  input: readFileSync(k6Script),
  stdio: ['pipe', 'inherit', 'inherit'],
});

process.exit(result.status ?? 1);

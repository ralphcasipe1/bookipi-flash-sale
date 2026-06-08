import { execSync } from 'node:child_process';

try {
  execSync('k6 version', { stdio: 'ignore' });
} catch {
  console.error('k6 is required for stress tests.');
  console.error('Install: https://k6.io/docs/get-started/installation/');
  console.error('  macOS:  brew install k6');
  console.error(
    '  Docker: docker run --rm -e API_URL=http://host.docker.internal:3000 grafana/k6 run - <app-api/stress/purchase.k6.js',
  );
  process.exit(1);
}

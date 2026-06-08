import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';
import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'http://localhost:3000';
const INITIAL_STOCK = Number(__ENV.INITIAL_STOCK || 100);
const STRESS_VUS = Number(__ENV.STRESS_VUS || 500);
const STRESS_ITERATIONS = Number(__ENV.STRESS_ITERATIONS || STRESS_VUS);

const purchaseSuccess = new Counter('purchase_success');
const purchaseSoldOut = new Counter('purchase_sold_out');
const purchaseAlreadyPurchased = new Counter('purchase_already_purchased');
const purchaseSaleNotActive = new Counter('purchase_sale_not_active');
const purchaseUnexpected = new Counter('purchase_unexpected');

export const options = {
  scenarios: {
    flash_sale: {
      executor: 'shared-iterations',
      vus: STRESS_VUS,
      iterations: STRESS_ITERATIONS,
      maxDuration: '60s',
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<500'],
    purchase_success: [`count==${INITIAL_STOCK}`],
    purchase_already_purchased: ['count==0'],
    purchase_unexpected: ['count==0'],
    purchase_sale_not_active: ['count==0'],
    checks: ['rate==1.0'],
  },
};

export default function flashSalePurchase() {
  const userId = `stress-${exec.scenario.iterationInTest}`;
  const response = http.post(`${API_URL}/sale/purchase`, JSON.stringify({ userId }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /sale/purchase' },
  });

  check(response, {
    'status is 200 or 409': (res) => res.status === 200 || res.status === 409,
  });

  let body;
  try {
    body = JSON.parse(response.body);
  } catch {
    purchaseUnexpected.add(1);
    return;
  }

  switch (body.result) {
    case 'success':
      purchaseSuccess.add(1);
      break;
    case 'sold_out':
      purchaseSoldOut.add(1);
      break;
    case 'already_purchased':
      purchaseAlreadyPurchased.add(1);
      break;
    case 'sale_not_active':
      purchaseSaleNotActive.add(1);
      break;
    default:
      purchaseUnexpected.add(1);
  }
}

export function handleSummary(data) {
  const successCount = data.metrics.purchase_success?.values?.count ?? 0;
  const soldOutCount = data.metrics.purchase_sold_out?.values?.count ?? 0;
  const alreadyCount = data.metrics.purchase_already_purchased?.values?.count ?? 0;
  const notActiveCount = data.metrics.purchase_sale_not_active?.values?.count ?? 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] ?? 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const rps = data.metrics.http_reqs?.values?.rate ?? 0;
  const oversellPass = successCount === INITIAL_STOCK;

  const report = [
    '',
    '── Flash sale stress summary ──',
    `Initial stock (expected successes): ${INITIAL_STOCK}`,
    `Actual successes:                   ${successCount}`,
    `Sold out responses:                 ${soldOutCount}`,
    `Already purchased responses:        ${alreadyCount}`,
    `Sale not active responses:          ${notActiveCount}`,
    `Oversell check:                     ${oversellPass ? 'PASS' : 'FAIL'}`,
    `Request rate (RPS):                 ${rps.toFixed(1)}`,
    `p95 latency (ms):                   ${p95.toFixed(1)}`,
    `p99 latency (ms):                   ${p99.toFixed(1)}`,
    '',
  ].join('\n');

  return {
    stdout: report + textSummary(data, { indent: ' ', enableColors: true }),
  };
}

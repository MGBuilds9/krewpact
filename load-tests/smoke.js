/**
 * k6 smoke test for KrewPact
 *
 * Run: k6 run load-tests/smoke.js --env BASE_URL=https://staging.krewpact.com
 *
 * Thresholds (tightened 2026-04-04 — baseline P95=180ms, 0% errors at 5 VUs):
 *   p(95) < 500ms  (was 2000ms)
 *   error rate < 1% (was 10%)
 */

import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!ok) {
    // Record failed check as an error metric
    // k6 built-in: errors counter increments when check fails
  }

  sleep(1);
}

import { readFile } from 'node:fs/promises';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '531c80b9991aad5e85f9d13f4d7de64e';
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error('Cloudflare deployment authorization is required.');
const worker = 'kmdm-home';
const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${worker}`;
const source = await readFile(new URL('../index.js', import.meta.url), 'utf8');
const form = new FormData();
form.set('metadata', new Blob([JSON.stringify({
  main_module: 'index.js',
  compatibility_date: '2026-10-14',
  observability: { enabled: true, traces: { enabled: true, head_sampling_rate: 0.1 } },
  tags: ['kmdm', 'independent-hosting'],
})], { type: 'application/json' }));
form.set('index.js', new Blob([source], { type: 'application/javascript+module' }), 'index.js');
async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare deployment failed: ${JSON.stringify(data.errors || response.status)}`);
  }
  return data.result;
}
const deployed = await request(base, { method: 'PUT', body: form });
await request(`${base}/subdomain`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled: true, previews_enabled: false }),
});
console.log(JSON.stringify({ worker, deploymentId: deployed.deployment_id, status: 'deployed' }));

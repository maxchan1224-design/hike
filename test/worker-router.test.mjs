import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/worker.mjs';

const origin = 'https://hike.maxchan1224.workers.dev';
const env = {ASSETS: {fetch: async () => new Response('DAYCATION HK', {status:200})}};
test('website is served using the existing Worker assets binding', async () => {
  const response = await app.fetch(new Request(origin + '/'), env, {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'DAYCATION HK');
});
test('API traffic goes to verified-activities backend (not SPA assets)', async () => {
  const response = await app.fetch(new Request(origin + '/api/health'), env, {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'Database not configured');
});
test('unknown admin endpoint is never served the SPA', async () => {
  const response = await app.fetch(new Request(origin + '/admin/unknown'), env, {});
  assert.equal(response.status, 503);
});

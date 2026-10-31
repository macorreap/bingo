import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';

test('El servidor entrega la aplicación y rechaza archivos privados y escrituras', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const resource of ['/', '/index.html?vista=publico', '/styles.css', '/app.js', '/assets/logo-oratorio.png']) {
    const response = await fetch(origin + resource);
    assert.equal(response.status, 200, resource);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  }
  for (const resource of ['/package.json', '/server.mjs', '/.git/config', '/%2e%2e/server.mjs', '/no-existe']) assert.equal((await fetch(origin + resource)).status, 404, resource);
  assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
  const head = await fetch(origin + '/styles.css', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

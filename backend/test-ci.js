/**
 * Deterministic backend CI smoke test.
 * Does not call Hugging Face or OpenRouter.
 */
import { app } from './index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function startTestServer() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = app.listen(0, '127.0.0.1');
    server.once('error', rejectPromise);
    server.once('listening', () => {
      const address = server.address();
      resolvePromise({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

let server;

try {
  const started = await startTestServer();
  server = started.server;

  const healthResponse = await fetch(`${started.baseUrl}/health`);
  const healthBody = await healthResponse.json();

  assert(healthResponse.status === 200, 'Expected /health to return HTTP 200.');
  assert(healthBody.status === 'ok', 'Expected /health status=ok.');

  const invalidQueryResponse = await fetch(
    `${started.baseUrl}/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: '',
      }),
    },
  );

  assert(
    invalidQueryResponse.status === 400,
    'Expected empty query to return HTTP 400.',
  );

  console.log('PASS - deterministic backend CI smoke test.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise((resolvePromise) => {
      server.close(resolvePromise);
    });
  }
}

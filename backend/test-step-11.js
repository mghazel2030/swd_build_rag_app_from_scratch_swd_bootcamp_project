import 'dotenv/config';
import { app } from './index.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

  const response = await fetch(
    `${started.baseUrl}/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:
          'What does the AI Systems in Production module teach?',
        topK: 3,
      }),
    },
  );

  const body = await response.json();

  console.log(JSON.stringify(body, null, 2));

  assert(response.status === 200, 'Expected HTTP 200.');

  for (const key of [
    'retrievalMs',
    'promptConstructionMs',
    'generationMs',
    'totalMs',
  ]) {
    assert(
      Number.isFinite(body.timings?.[key]),
      `Missing numeric timing: ${key}`,
    );
  }

  console.log(
    'PASS - Step 11 backend timing observability.',
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : error,
  );
  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise((resolvePromise) => {
      server.close(resolvePromise);
    });
  }
}

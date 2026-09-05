/**
 * RAG from Scratch - Step 9 API Integration Test
 *
 * Tests:
 *   GET /health
 *   POST /query validation
 *   POST /query full live RAG
 *   404 JSON contract
 *
 * /ingest is tested manually because rebuilding all embeddings during
 * every regression run is unnecessarily expensive.
 */
import 'dotenv/config';

import { app } from './index.js';

function printDivider(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

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
  printDivider('STEP 9 - BACKEND API INTEGRATION TEST');

  const started = await startTestServer();
  server = started.server;
  const baseUrl = started.baseUrl;

  console.log(`Test server: ${baseUrl}`);

  printDivider('1. GET /health');

  const healthResponse = await fetch(`${baseUrl}/health`);
  const health = await healthResponse.json();

  console.log(health);

  assert(
    healthResponse.status === 200,
    'Expected GET /health to return HTTP 200.',
  );

  assert(
    health.status === 'ok',
    'Health response did not report status=ok.',
  );

  console.log('PASS - health endpoint');

  printDivider('2. POST /query VALIDATION');

  const invalidResponse = await fetch(
    `${baseUrl}/query`,
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

  const invalidBody = await invalidResponse.json();

  console.log(invalidBody);

  assert(
    invalidResponse.status === 400,
    'Expected empty question to return HTTP 400.',
  );

  console.log('PASS - invalid question rejected');

  printDivider('3. POST /query FULL RAG REQUEST');

  const question =
    'What does the AI Systems in Production module teach?';

  const queryResponse = await fetch(
    `${baseUrl}/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        topK: 3,
      }),
    },
  );

  const queryBody = await queryResponse.json();

  console.log(JSON.stringify(queryBody, null, 2));

  assert(
    queryResponse.status === 200,
    `Expected POST /query to return HTTP 200 but received ${queryResponse.status}.`,
  );

  assert(
    typeof queryBody.answer === 'string' &&
      queryBody.answer.trim().length > 0,
    'Query response contains no answer.',
  );

  assert(
    Array.isArray(queryBody.retrievedChunks) &&
      queryBody.retrievedChunks.length === 3,
    'Expected exactly three retrieved chunks.',
  );

  console.log('PASS - full query endpoint');

  printDivider('4. UNKNOWN ROUTE');

  const notFoundResponse =
    await fetch(`${baseUrl}/does-not-exist`);

  const notFound = await notFoundResponse.json();

  console.log(notFound);

  assert(
    notFoundResponse.status === 404,
    'Expected unknown route to return HTTP 404.',
  );

  console.log('PASS - 404 JSON response');

  printDivider('STEP 9 COMPLETE');
} catch (error) {
  printDivider('STEP 9 FAILED');

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

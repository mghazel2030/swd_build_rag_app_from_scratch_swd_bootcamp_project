/**
 * ================================================================
 * RAG from Scratch
 * Step 6 Verification Script - Vector Search
 * ================================================================
 *
 * Prerequisite:
 *   npm run ingest
 *
 * Run:
 *   npm run test:step6
 * ================================================================
 */

import 'dotenv/config';

import {
  dirname,
  resolve,
} from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

import {
  loadVectorStore,
  search,
} from './pipeline.js';

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  dirname(currentFilePath);

const storePath =
  resolve(
    currentDirectory,
    'store.json',
  );

const TOP_K = 3;

function printDivider(title) {
  console.log(
    '\n' + '='.repeat(80),
  );
  console.log(title);
  console.log(
    '='.repeat(80),
  );
}

function preview(
  text,
  maxLength = 280,
) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runQueryCase({
  label,
  query,
  expectedTerms,
}) {
  printDivider(label);

  console.log(`Query: ${query}`);

  const results =
    await search(
      query,
      TOP_K,
      { storePath },
    );

  assert(
    results.length === TOP_K,
    `Expected ${TOP_K} results but received ${results.length}.`,
  );

  for (
    let i = 1;
    i < results.length;
    i += 1
  ) {
    assert(
      results[i - 1].score >=
        results[i].score,
      'Results are not sorted by descending score.',
    );
  }

  results.forEach(
    (result, index) => {
      console.log(`\n#${index + 1}`);
      console.log(
        `Chunk index : ${result.chunkIndex}`,
      );
      console.log(
        `Score       : ${result.score.toFixed(6)}`,
      );
      console.log(
        `Source      : ${result.source}`,
      );
      console.log(
        `Preview     : ${preview(result.text)}`,
      );
    },
  );

  const combined =
    results
      .map((r) => r.text)
      .join(' ')
      .toLowerCase();

  const matchedTerms =
    expectedTerms.filter(
      (term) =>
        combined.includes(
          term.toLowerCase(),
        ),
    );

  assert(
    matchedTerms.length > 0,
    `Expected at least one topic term in top-K: ${expectedTerms.join(', ')}`,
  );

  console.log(
    `\nPASS - relevant top-K content found (${matchedTerms.join(', ')}).`,
  );
}

try {
  printDivider(
    'STEP 6 - VECTOR SEARCH TEST',
  );

  const vectorStore =
    loadVectorStore(storePath);

  console.log(
    `Indexed chunks      : ${vectorStore.items.length}`,
  );
  console.log(
    `Embedding model     : ${vectorStore.metadata?.embeddingModel ?? 'unknown'}`,
  );
  console.log(
    `Embedding dimension : ${vectorStore.metadata?.embeddingDimension ?? 'unknown'}`,
  );

  await runQueryCase({
    label:
      'QUERY 1 - AI SYSTEMS IN PRODUCTION / RAG',
    query:
      'What does the AI Systems in Production module teach about RAG and deploying AI systems?',
    expectedTerms: [
      'Retrieval',
      'RAG',
      'production',
      'monitoring',
      'guardrails',
    ],
  });

  await runQueryCase({
    label:
      'QUERY 2 - HARDWARE REQUIREMENTS',
    query:
      'What computer hardware and memory are recommended for the bootcamp?',
    expectedTerms: [
      'Memory',
      'RAM',
      'Storage',
      'Processor',
      'Windows',
    ],
  });

  await runQueryCase({
    label:
      'QUERY 3 - FRONT-END DEVELOPMENT / REACT',
    query:
      'What does the front-end development module teach about React?',
    expectedTerms: [
      'React',
      'Front-End',
      'component',
      'interfaces',
    ],
  });

  printDivider(
    'VALIDATION TESTS',
  );

  try {
    await search(
      '',
      3,
      { storePath },
    );
    throw new Error(
      'Expected empty query validation to fail.',
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        'Expected empty query',
      )
    ) {
      throw error;
    }

    console.log(
      `PASS - empty query rejected: ${error.message}`,
    );
  }

  try {
    await search(
      'RAG',
      0,
      { storePath },
    );
    throw new Error(
      'Expected invalid k validation to fail.',
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        'Expected invalid k',
      )
    ) {
      throw error;
    }

    console.log(
      `PASS - invalid k rejected: ${error.message}`,
    );
  }

  printDivider(
    'STEP 6 COMPLETE',
  );
} catch (error) {
  printDivider(
    'STEP 6 FAILED',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}

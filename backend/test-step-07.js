/**
 * ================================================================
 * RAG from Scratch
 * Step 7 Verification Script - Grounded Prompt Construction
 * ================================================================
 *
 * Prerequisite:
 *   npm run ingest
 *
 * Run:
 *   npm run test:step7
 *
 * This script:
 *   1. retrieves top-K chunks for a real PDF question,
 *   2. builds the system prompt,
 *   3. prints the exact prompt,
 *   4. validates grounding instructions and context inclusion,
 *   5. tests local invalid-input behavior.
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
  buildSystemPrompt,
  search,
} from './pipeline.js';

const currentFilePath =
  fileURLToPath(
    import.meta.url,
  );

const currentDirectory =
  dirname(
    currentFilePath,
  );

const storePath =
  resolve(
    currentDirectory,
    'store.json',
  );

const QUERY =
  'What does the AI Systems in Production module teach about RAG and deploying AI systems?';

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

function assert(
  condition,
  message,
) {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

function expectFailure(
  label,
  fn,
) {
  try {
    fn();

    throw new Error(
      `${label}: expected an error, but none was thrown.`,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        'expected an error',
      )
    ) {
      throw error;
    }

    console.log(
      `PASS - ${label}: ${error.message}`,
    );
  }
}

try {
  printDivider(
    'STEP 7 - GROUNDED PROMPT CONSTRUCTION',
  );

  console.log(
    `Query: ${QUERY}`,
  );

  /*
   * --------------------------------------------------------------
   * 1. RETRIEVE TOP-K CHUNKS
   * --------------------------------------------------------------
   */

  const retrievedChunks =
    await search(
      QUERY,
      TOP_K,
      {
        storePath,
      },
    );

  assert(
    retrievedChunks.length ===
      TOP_K,
    `Expected ${TOP_K} retrieved chunks.`,
  );

  printDivider(
    '1. RETRIEVED CHUNKS',
  );

  retrievedChunks.forEach(
    (
      chunk,
      index,
    ) => {
      console.log(
        `#${index + 1} | chunk=${chunk.chunkIndex} | score=${chunk.score.toFixed(6)}`,
      );

      console.log(
        chunk.text
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 260),
      );

      console.log();
    },
  );

  /*
   * --------------------------------------------------------------
   * 2. BUILD THE GROUNDED SYSTEM PROMPT
   * --------------------------------------------------------------
   */

  const systemPrompt =
    buildSystemPrompt(
      retrievedChunks,
    );

  printDivider(
    '2. EXACT SYSTEM PROMPT',
  );

  console.log(
    systemPrompt,
  );

  /*
   * --------------------------------------------------------------
   * 3. PROMPT VALIDATION
   * --------------------------------------------------------------
   */

  printDivider(
    '3. PROMPT VALIDATION',
  );

  assert(
    systemPrompt.includes(
      'ONLY the retrieved context',
    ),
    'Prompt is missing the grounding instruction.',
  );

  assert(
    systemPrompt.includes(
      'I do not know based on the provided context.',
    ),
    'Prompt is missing the insufficient-context fallback.',
  );

  assert(
    systemPrompt.includes(
      '[CONTEXT 1]',
    ),
    'Prompt is missing context numbering.',
  );

  for (
    let index = 0;
    index <
      retrievedChunks.length;
    index += 1
  ) {
    const chunk =
      retrievedChunks[index];

    assert(
      systemPrompt.includes(
        chunk.text.trim(),
      ),
      `Prompt does not contain retrieved chunk ${index}.`,
    );

    assert(
      systemPrompt.includes(
        `Chunk: ${chunk.chunkIndex}`,
      ),
      `Prompt does not contain chunk metadata for result ${index}.`,
    );
  }

  console.log(
    'PASS - all retrieved chunks are present.',
  );

  console.log(
    'PASS - grounding instruction is present.',
  );

  console.log(
    'PASS - insufficient-context fallback is present.',
  );

  console.log(
    'PASS - source/chunk metadata is present.',
  );

  /*
   * --------------------------------------------------------------
   * 4. LOCAL FAILURE TESTS
   * --------------------------------------------------------------
   */

  printDivider(
    '4. VALIDATION / FAILURE TESTS',
  );

  expectFailure(
    'reject non-array input',
    () =>
      buildSystemPrompt(
        'not-an-array',
      ),
  );

  expectFailure(
    'reject empty array',
    () =>
      buildSystemPrompt(
        [],
      ),
  );

  expectFailure(
    'reject chunk without text',
    () =>
      buildSystemPrompt([
        {
          source:
            'test.pdf',
          chunkIndex: 0,
          score: 0.9,
        },
      ]),
  );

  /*
   * --------------------------------------------------------------
   * 5. OUT-OF-CONTEXT POLICY DEMONSTRATION
   * --------------------------------------------------------------
   */

  printDivider(
    '5. OUT-OF-CONTEXT POLICY',
  );

  console.log(
    'If the user later asks something unsupported by the retrieved context, the future LLM will be instructed to answer:',
  );

  console.log(
    '"I do not know based on the provided context."',
  );

  printDivider(
    'INTERPRETATION',
  );

  console.log(
    [
      'Step 7 does not generate an answer.',
      'It converts retrieval results into a controlled evidence package for the future LLM.',
      'The system prompt establishes the grounding policy, the retrieved chunks provide evidence,',
      'and the original user question will later be supplied separately as the user message.',
      'This separation keeps retrieval, prompt construction, and generation independently testable.',
    ].join(' '),
  );

  printDivider(
    'STEP 7 COMPLETE',
  );
} catch (error) {
  printDivider(
    'STEP 7 FAILED',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}

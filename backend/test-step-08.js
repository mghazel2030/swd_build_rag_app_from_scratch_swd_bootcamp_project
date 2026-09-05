/**
 * RAG from Scratch - Step 8 Verification Script
 *
 * Prerequisites:
 *   - backend/.env contains HF_API_KEY and OPENROUTER_API_KEY
 *   - store.json exists
 *
 * Run:
 *   npm run test:step8
 */
import 'dotenv/config';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GENERATION_MODEL,
  generateAnswer,
} from './generate.js';

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  dirname(currentFilePath);

const storePath =
  resolve(currentDirectory, 'store.json');

function printDivider(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

function preview(text, maxLength = 250) {
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

async function runCase({
  label,
  query,
  expectedEvidenceTerms = [],
}) {
  printDivider(label);
  console.log(`Query: ${query}`);

  const result = await generateAnswer(
    query,
    {
      topK: 3,
      storePath,
    },
  );

  console.log(
    `Generation model: ${result.model}`,
  );

  printDivider('RETRIEVED EVIDENCE');

  result.retrievedChunks.forEach(
    (chunk, index) => {
      console.log(
        `#${index + 1} | chunk=${chunk.chunkIndex} | score=${chunk.score.toFixed(6)}`,
      );
      console.log(preview(chunk.text));
      console.log();
    },
  );

  printDivider('FINAL GROUNDED ANSWER');
  console.log(result.answer);

  assert(
    typeof result.answer === 'string' &&
      result.answer.trim().length > 0,
    'Generation returned an empty answer.',
  );

  assert(
    result.retrievedChunks.length === 3,
    'Expected exactly 3 retrieved chunks.',
  );

  assert(
    result.systemPrompt.includes(
      'ONLY the retrieved context',
    ),
    'Grounding instruction is missing from the system prompt.',
  );

  if (expectedEvidenceTerms.length > 0) {
    const evidence =
      result.retrievedChunks
        .map((chunk) => chunk.text)
        .join(' ')
        .toLowerCase();

    const matched =
      expectedEvidenceTerms.filter(
        (term) =>
          evidence.includes(
            term.toLowerCase(),
          ),
      );

    assert(
      matched.length > 0,
      `Expected relevant evidence terms: ${expectedEvidenceTerms.join(', ')}`,
    );

    console.log(
      `\nPASS - retrieved evidence contains: ${matched.join(', ')}`,
    );
  }

  return result;
}

try {
  printDivider(
    'STEP 8 - FULL RAG GENERATION FLOW',
  );

  if (
    typeof process.env.HF_API_KEY !== 'string' ||
    process.env.HF_API_KEY.trim() === ''
  ) {
    throw new Error(
      'HF_API_KEY is missing from backend/.env.',
    );
  }

  if (
    typeof process.env.OPENROUTER_API_KEY !== 'string' ||
    process.env.OPENROUTER_API_KEY.trim() === ''
  ) {
    throw new Error(
      'OPENROUTER_API_KEY is missing from backend/.env.',
    );
  }

  console.log(
    `Configured generation model: ${GENERATION_MODEL}`,
  );

  const inContext =
    await runCase({
      label:
        'CASE 1 - IN-CONTEXT RAG QUESTION',
      query:
        'What does the AI Systems in Production module teach?',
      expectedEvidenceTerms: [
        'RAG',
        'Retrieval',
        'monitoring',
        'guardrails',
        'production',
      ],
    });

  assert(
    !inContext.answer
      .toLowerCase()
      .includes(
        'i do not know based on the provided context',
      ),
    'The model used the fallback even though relevant evidence was retrieved.',
  );

  console.log(
    '\nPASS - in-context question produced a grounded answer.',
  );

  const outOfContext =
    await runCase({
      label:
        'CASE 2 - OUT-OF-CONTEXT QUESTION',
      query:
        'What is the capital of Australia?',
    });

  const normalizedAnswer =
    outOfContext.answer.toLowerCase();

  const usedFallback =
    normalizedAnswer.includes('do not know') ||
    normalizedAnswer.includes('provided context') ||
    normalizedAnswer.includes('retrieved context');

  if (usedFallback) {
    console.log(
      '\nPASS - model respected the insufficient-context policy.',
    );
  } else {
    console.log(
      '\nWARNING - model did not use the requested fallback wording. Inspect the answer manually; this is model behavior rather than a retrieval-code failure.',
    );
  }

  printDivider('LOCAL VALIDATION TEST');

  try {
    await generateAnswer(
      '',
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

  printDivider('STEP 8 COMPLETE');
} catch (error) {
  printDivider('STEP 8 FAILED');

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}

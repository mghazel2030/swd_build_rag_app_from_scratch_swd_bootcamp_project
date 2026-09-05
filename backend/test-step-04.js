/**
 * ================================================================
 * RAG from Scratch
 * Step 4 Verification Script - Embeddings
 * ================================================================
 *
 * Purpose
 * -------
 * Verify that text and real PDF chunks can be transformed into
 * numeric semantic vectors using Hugging Face Inference.
 *
 * This test intentionally does NOT implement semantic similarity.
 * Cosine similarity belongs to Step 5.
 *
 * Requirements
 * ------------
 * backend/.env must contain:
 *
 *   HF_API_KEY=hf_...
 *
 * Run:
 *
 *   npm run test:step4
 * ================================================================
 */

import 'dotenv/config';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EMBEDDING_MODEL,
  chunkText,
  embedText,
  extractTextFromPdf,
} from './pipeline.js';

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  dirname(currentFilePath);

const PDF_FILE_NAME =
  'Circuit Stream--Software Development Bootcamp Guide.pdf';

const pdfPath =
  resolve(
    currentDirectory,
    PDF_FILE_NAME,
  );

const EXPECTED_DIMENSION = 384;
const SAMPLE_CHUNK_COUNT = 3;

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
  maxLength = 120,
) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function validateEmbedding(
  embedding,
  label,
) {
  if (!Array.isArray(embedding)) {
    throw new Error(
      `${label}: embedding is not an array.`,
    );
  }

  if (
    embedding.length !==
    EXPECTED_DIMENSION
  ) {
    throw new Error(
      `${label}: expected ${EXPECTED_DIMENSION} dimensions but received ${embedding.length}.`,
    );
  }

  if (
    !embedding.every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value),
    )
  ) {
    throw new Error(
      `${label}: embedding contains a non-finite or non-numeric value.`,
    );
  }
}

function getVectorStats(
  embedding,
) {
  const sum =
    embedding.reduce(
      (total, value) =>
        total + value,
      0,
    );

  const squaredSum =
    embedding.reduce(
      (total, value) =>
        total + value * value,
      0,
    );

  return {
    min:
      Math.min(...embedding),
    max:
      Math.max(...embedding),
    mean:
      sum / embedding.length,
    l2Norm:
      Math.sqrt(squaredSum),
  };
}

function printEmbeddingSummary(
  embedding,
  label,
) {
  const stats =
    getVectorStats(
      embedding,
    );

  console.log(`\n${label}`);
  console.log(
    `Dimensions : ${embedding.length}`,
  );
  console.log(
    `First 8    : ${embedding
      .slice(0, 8)
      .map(
        (value) =>
          value.toFixed(6),
      )
      .join(', ')}`,
  );
  console.log(
    `Min        : ${stats.min.toFixed(6)}`,
  );
  console.log(
    `Max        : ${stats.max.toFixed(6)}`,
  );
  console.log(
    `Mean       : ${stats.mean.toFixed(6)}`,
  );
  console.log(
    `L2 norm    : ${stats.l2Norm.toFixed(6)}`,
  );
}

try {
  printDivider(
    'STEP 4 - EMBEDDINGS TEST',
  );

  if (
    typeof process.env.HF_API_KEY !==
      'string' ||
    process.env.HF_API_KEY.trim() ===
      ''
  ) {
    throw new Error(
      [
        'HF_API_KEY is missing.',
        'Copy .env.example to .env and add your Hugging Face token.',
        'Do not commit .env to Git.',
      ].join(' '),
    );
  }

  console.log(
    `Embedding model : ${EMBEDDING_MODEL}`,
  );

  printDivider(
    'CONTROLLED SINGLE-TEXT EMBEDDING',
  );

  const controlledText =
    'Retrieval-Augmented Generation retrieves relevant context before an LLM generates an answer.';

  console.log(
    `Input text : ${controlledText}`,
  );

  const controlledEmbedding =
    await embedText(
      controlledText,
    );

  validateEmbedding(
    controlledEmbedding,
    'Controlled text',
  );

  printEmbeddingSummary(
    controlledEmbedding,
    'Controlled text embedding',
  );

  printDivider(
    'REAL PDF -> CHUNKS',
  );

  const pdfText =
    await extractTextFromPdf(
      pdfPath,
    );

  const chunks =
    chunkText(
      pdfText,
      {
        size: 500,
        overlap: 50,
      },
    );

  if (
    chunks.length <
    SAMPLE_CHUNK_COUNT
  ) {
    throw new Error(
      `Expected at least ${SAMPLE_CHUNK_COUNT} chunks but received ${chunks.length}.`,
    );
  }

  console.log(
    `PDF characters : ${pdfText.length}`,
  );
  console.log(
    `Total chunks   : ${chunks.length}`,
  );
  console.log(
    'Chunk config   : size=500, overlap=50',
  );

  printDivider(
    `EMBED FIRST ${SAMPLE_CHUNK_COUNT} REAL CHUNKS`,
  );

  for (
    let index = 0;
    index < SAMPLE_CHUNK_COUNT;
    index += 1
  ) {
    const chunk =
      chunks[index];

    console.log(
      `\nChunk ${index} text (${chunk.length} chars):`,
    );
    console.log(
      preview(chunk),
    );

    const embedding =
      await embedText(chunk);

    validateEmbedding(
      embedding,
      `Chunk ${index}`,
    );

    printEmbeddingSummary(
      embedding,
      `Chunk ${index} embedding`,
    );
  }

  printDivider(
    'LOCAL VALIDATION TESTS',
  );

  for (
    const invalidInput of ['', '   ']
  ) {
    try {
      await embedText(
        invalidInput,
      );

      throw new Error(
        'Expected embedText() to reject empty input.',
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          'Expected embedText()',
        )
      ) {
        throw error;
      }

      console.log(
        `PASS - rejected empty input: ${error.message}`,
      );
    }
  }

  printDivider(
    'INTERPRETATION',
  );

  console.log(
    [
      'Each input text has now been converted into a fixed-length',
      `${EXPECTED_DIMENSION}-dimensional numeric vector.`,
      'The individual numbers are not meant to be interpreted one by one.',
      'Their usefulness appears when embeddings are compared geometrically.',
      'That comparison is deliberately deferred until Step 5, where',
      'we will implement cosine similarity from scratch.',
    ].join(' '),
  );

  printDivider(
    'STEP 4 COMPLETE',
  );
} catch (error) {
  printDivider(
    'STEP 4 FAILED',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}

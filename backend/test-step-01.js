/**
 * ================================================================
 * RAG from Scratch
 * Step 1 Verification Script - Plain-Text Ingestion
 * ================================================================
 *
 * Purpose
 * -------
 * Exercise extractText() against backend/sample.txt and make the
 * ingestion result directly observable before moving to PDF parsing.
 *
 * This script verifies that:
 *   1. The input file exists and can be read.
 *   2. extractText() returns a JavaScript string.
 *   3. The returned string is non-empty.
 *   4. We can inspect useful characteristics of the ingested text.
 *
 * Run from the backend directory with:
 *   npm run test:step1
 * ================================================================
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { extractText } from './pipeline.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const samplePath = resolve(currentDirectory, 'sample.txt');

const PREVIEW_LENGTH = 500;

function printDivider(title) {
  console.log('\n' + '='.repeat(72));
  console.log(title);
  console.log('='.repeat(72));
}

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function countWords(text) {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

try {
  printDivider('STEP 1 - PLAIN-TEXT INGESTION TEST');

  console.log(`Input file : ${samplePath}`);

  const text = extractText(samplePath);

  if (typeof text !== 'string') {
    throw new TypeError(`Expected a string, but received: ${typeof text}`);
  }

  if (text.trim().length === 0) {
    throw new Error('The ingested document is empty.');
  }

  console.log('Status     : PASS');
  console.log(`Data type  : ${typeof text}`);
  console.log(`Characters : ${text.length}`);
  console.log(`Words      : ${countWords(text)}`);
  console.log(`Lines      : ${countLines(text)}`);

  printDivider(`FIRST ${PREVIEW_LENGTH} CHARACTERS`);
  console.log(text.slice(0, PREVIEW_LENGTH));

  printDivider('INTERPRETATION');
  console.log(
    [
      'The document has been successfully normalized into a JavaScript string.',
      'That string is now suitable as input to the next preprocessing stage:',
      'chunking. In Step 2, a PDF parser will produce the same output type',
      '(plain text), even though the original file format is different.',
    ].join(' '),
  );

  printDivider('STEP 1 COMPLETE');
} catch (error) {
  printDivider('STEP 1 FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

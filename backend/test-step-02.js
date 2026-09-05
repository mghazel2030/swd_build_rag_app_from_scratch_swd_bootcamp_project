/**
 * ================================================================
 * RAG from Scratch
 * Step 2 Regression Test - PDF Ingestion (pdf-parse v2)
 * ================================================================
 *
 * Run:
 *   npm run test:step2
 * ================================================================
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractTextFromPdf } from './pipeline.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);

const PDF_FILE_NAME =
  'Circuit Stream--Software Development Bootcamp Guide.pdf';

const pdfPath = resolve(
  currentDirectory,
  PDF_FILE_NAME,
);

const PREVIEW_LENGTH = 1200;

function printDivider(title) {
  console.log('\n' + '='.repeat(76));
  console.log(title);
  console.log('='.repeat(76));
}

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function countWords(text) {
  const trimmed = text.trim();

  return trimmed === ''
    ? 0
    : trimmed.split(/\s+/).length;
}

function createPreview(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, PREVIEW_LENGTH);
}

try {
  printDivider(
    'STEP 2 - PDF INGESTION REGRESSION TEST',
  );

  console.log(`Input file : ${pdfPath}`);
  console.log('Parser     : pdf-parse v2');

  const text =
    await extractTextFromPdf(
      pdfPath,
    );

  if (
    typeof text !== 'string' ||
    text.trim().length === 0
  ) {
    throw new Error(
      'PDF extraction did not return usable text.',
    );
  }

  const expectedTerms = [
    'AI Software Development',
    'Bootcamp',
    'Curriculum',
  ];

  const matchedTerms =
    expectedTerms.filter(
      (term) =>
        text
          .toLowerCase()
          .includes(
            term.toLowerCase(),
          ),
    );

  if (matchedTerms.length === 0) {
    throw new Error(
      'Expected Circuit Stream Bootcamp content was not found.',
    );
  }

  console.log('Status     : PASS');
  console.log(`Data type  : ${typeof text}`);
  console.log(`Characters : ${text.length}`);
  console.log(`Words      : ${countWords(text)}`);
  console.log(`Lines      : ${countLines(text)}`);
  console.log(
    `Terms found: ${matchedTerms.join(', ')}`,
  );

  printDivider(
    `FIRST ${PREVIEW_LENGTH} CHARACTERS`,
  );

  console.log(
    createPreview(text),
  );

  printDivider(
    'STEP 2 REGRESSION TEST COMPLETE',
  );
} catch (error) {
  printDivider(
    'STEP 2 FAILED',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}

/**
 * ================================================================
 * RAG from Scratch
 * Step 3 Verification Script - Chunking
 * ================================================================
 *
 * Run:
 *   npm run test:step3
 * ================================================================
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  chunkText,
  extractTextFromPdf,
} from './pipeline.js';

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  dirname(currentFilePath);

const PDF_FILE_NAME =
  'Circuit Stream--Software Development Bootcamp Guide.pdf';

const pdfPath = resolve(
  currentDirectory,
  PDF_FILE_NAME,
);

const BOUNDARY_PREVIEW = 140;

function printDivider(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

function preview(
  text,
  maxLength = BOUNDARY_PREVIEW,
) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getChunkStats(chunks) {
  if (chunks.length === 0) {
    return {
      count: 0,
      minLength: 0,
      maxLength: 0,
      averageLength: 0,
    };
  }

  const lengths =
    chunks.map(
      (chunk) => chunk.length,
    );

  return {
    count: chunks.length,
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    averageLength:
      lengths.reduce(
        (sum, length) =>
          sum + length,
        0,
      ) / lengths.length,
  };
}

function verifyOverlap(
  chunks,
  overlap,
) {
  if (
    overlap === 0 ||
    chunks.length < 2
  ) {
    return true;
  }

  for (
    let i = 0;
    i < chunks.length - 1;
    i += 1
  ) {
    const left = chunks[i];
    const right = chunks[i + 1];

    const comparableLength =
      Math.min(
        overlap,
        left.length,
        right.length,
      );

    if (
      left.slice(-comparableLength) !==
      right.slice(0, comparableLength)
    ) {
      return false;
    }
  }

  return true;
}

function showBoundary(
  chunks,
  boundaryIndex = 0,
) {
  if (chunks.length < 2) {
    console.log(
      'Not enough chunks to display a boundary.',
    );

    return;
  }

  const leftIndex =
    Math.min(
      boundaryIndex,
      chunks.length - 2,
    );

  console.log(
    `Chunk ${leftIndex} tail:`,
  );

  console.log(
    preview(
      chunks[leftIndex].slice(
        -BOUNDARY_PREVIEW,
      ),
    ),
  );

  console.log(
    `\nChunk ${leftIndex + 1} head:`,
  );

  console.log(
    preview(
      chunks[leftIndex + 1].slice(
        0,
        BOUNDARY_PREVIEW,
      ),
    ),
  );
}

function expectFailure(
  name,
  fn,
) {
  try {
    fn();

    throw new Error(
      `${name}: expected an error, but none was thrown.`,
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
      `PASS - ${name}: ${error.message}`,
    );
  }
}

try {
  printDivider(
    'STEP 3 - CHUNKING TEST',
  );

  console.log(
    `Input PDF : ${pdfPath}`,
  );

  /*
   * First verify the Step-2 dependency. Step 3 cannot be evaluated
   * meaningfully if PDF ingestion has failed.
   */
  const text =
    await extractTextFromPdf(
      pdfPath,
    );

  console.log(
    'PDF input  : PASS',
  );

  console.log(
    `Characters : ${text.length}`,
  );

  const configurations = [
    {
      label:
        'A - Small, no overlap',
      size: 500,
      overlap: 0,
    },
    {
      label:
        'B - Small, 10% overlap',
      size: 500,
      overlap: 50,
    },
    {
      label:
        'C - Medium, 10% overlap',
      size: 1000,
      overlap: 100,
    },
    {
      label:
        'D - Larger, 10% overlap',
      size: 1500,
      overlap: 150,
    },
  ];

  printDivider(
    'CHUNKING CONFIGURATION COMPARISON',
  );

  console.log(
    [
      'Configuration'.padEnd(30),
      'Size'.padStart(8),
      'Overlap'.padStart(10),
      'Chunks'.padStart(10),
      'Avg Len'.padStart(10),
    ].join(''),
  );

  console.log(
    '-'.repeat(68),
  );

  const results = [];

  for (
    const config of configurations
  ) {
    const chunks =
      chunkText(
        text,
        config,
      );

    const stats =
      getChunkStats(
        chunks,
      );

    if (
      stats.maxLength >
      config.size
    ) {
      throw new Error(
        `${config.label}: chunk exceeds configured size.`,
      );
    }

    if (
      !verifyOverlap(
        chunks,
        config.overlap,
      )
    ) {
      throw new Error(
        `${config.label}: overlap verification failed.`,
      );
    }

    results.push({
      ...config,
      chunks,
      stats,
    });

    console.log(
      [
        config.label.padEnd(30),
        String(config.size).padStart(8),
        String(config.overlap).padStart(10),
        String(stats.count).padStart(10),
        stats.averageLength
          .toFixed(1)
          .padStart(10),
      ].join(''),
    );
  }

  printDivider(
    'BOUNDARY - 500 / 0',
  );

  showBoundary(
    results[0].chunks,
  );

  printDivider(
    'BOUNDARY - 500 / 50',
  );

  showBoundary(
    results[1].chunks,
  );

  printDivider(
    'FIRST TWO DEFAULT CHUNKS',
  );

  const defaultChunks =
    chunkText(text);

  defaultChunks
    .slice(0, 2)
    .forEach(
      (chunk, index) => {
        console.log(
          `\n--- Chunk ${index} (${chunk.length} characters) ---`,
        );

        console.log(chunk);
      },
    );

  printDivider(
    'VALIDATION / EDGE CASES',
  );

  if (
    chunkText('').length !== 0
  ) {
    throw new Error(
      'Empty input should return [].',
    );
  }

  console.log(
    'PASS - empty text returns []',
  );

  const shortText = 'Short text.';
  const shortChunks =
    chunkText(shortText);

  if (
    shortChunks.length !== 1 ||
    shortChunks[0] !== shortText
  ) {
    throw new Error(
      'Short input should return one unchanged chunk.',
    );
  }

  console.log(
    'PASS - short text returns one chunk',
  );

  expectFailure(
    'overlap cannot equal size',
    () =>
      chunkText(
        'abc',
        {
          size: 10,
          overlap: 10,
        },
      ),
  );

  expectFailure(
    'overlap cannot exceed size',
    () =>
      chunkText(
        'abc',
        {
          size: 10,
          overlap: 11,
        },
      ),
  );

  expectFailure(
    'size must be positive',
    () =>
      chunkText(
        'abc',
        {
          size: 0,
          overlap: 0,
        },
      ),
  );

  expectFailure(
    'overlap cannot be negative',
    () =>
      chunkText(
        'abc',
        {
          size: 10,
          overlap: -1,
        },
      ),
  );

  printDivider(
    'STEP 3 COMPLETE',
  );
} catch (error) {
  printDivider(
    'STEP 3 FAILED',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}

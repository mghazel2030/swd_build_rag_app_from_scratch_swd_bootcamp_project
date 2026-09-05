/**
 * RAG from Scratch - Step 9
 * Reusable Document Ingestion Service + CLI
 */
import 'dotenv/config';

import { basename, dirname, extname, resolve } from 'node:path';
import { unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  EMBEDDING_MODEL,
  chunkText,
  embedText,
  extractText,
  extractTextFromPdf,
} from './pipeline.js';

import { saveVectorStore } from './store.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);

const DEFAULT_PDF_NAME =
  'Circuit Stream--Software Development Bootcamp Guide.pdf';

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 50;

async function extractDocumentText(filePath, originalName) {
  const extension = extname(originalName).toLowerCase();

  if (extension === '.pdf') {
    return extractTextFromPdf(filePath);
  }

  if (extension === '.txt') {
    return extractText(filePath);
  }

  throw new Error('Only .pdf and .txt files are supported.');
}

export async function ingestDocument({
  filePath,
  originalName,
  storePath,
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  deleteSourceAfter = false,
}) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new TypeError(
      'ingestDocument() requires a non-empty filePath.',
    );
  }

  if (typeof originalName !== 'string' || originalName.trim() === '') {
    throw new TypeError(
      'ingestDocument() requires a non-empty originalName.',
    );
  }

  if (typeof storePath !== 'string' || storePath.trim() === '') {
    throw new TypeError(
      'ingestDocument() requires a non-empty storePath.',
    );
  }

  try {
    const text = await extractDocumentText(filePath, originalName);

    const chunks = chunkText(text, {
      size: chunkSize,
      overlap: chunkOverlap,
    });

    if (chunks.length === 0) {
      throw new Error('Document produced zero chunks.');
    }

    const items = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const embedding = await embedText(chunks[index]);

      items.push({
        id: index,
        chunkIndex: index,
        source: originalName,
        text: chunks[index],
        embedding,
      });

      console.log(
        `Embedded chunk ${index + 1}/${chunks.length}`,
      );
    }

    const vectorStore = {
      metadata: {
        version: 1,
        createdAt: new Date().toISOString(),
        source: originalName,
        embeddingModel: EMBEDDING_MODEL,
        embeddingDimension: items[0].embedding.length,
        chunkSize,
        chunkOverlap,
        totalChunks: items.length,
      },
      items,
    };

    saveVectorStore(storePath, vectorStore);

    return {
      source: originalName,
      totalCharacters: text.length,
      totalChunks: items.length,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimension: items[0].embedding.length,
      chunkSize,
      chunkOverlap,
      storePath,
    };
  } finally {
    if (deleteSourceAfter) {
      try {
        unlinkSync(filePath);
      } catch {
        // Best-effort cleanup.
      }
    }
  }
}

async function runCli() {
  const pdfPath = resolve(currentDirectory, DEFAULT_PDF_NAME);
  const storePath = resolve(currentDirectory, 'store.json');

  console.log('Building vector store...');

  const result = await ingestDocument({
    filePath: pdfPath,
    originalName: basename(pdfPath),
    storePath,
  });

  console.log(JSON.stringify(result, null, 2));
}

const isDirectExecution =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  runCli().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );
    process.exitCode = 1;
  });
}

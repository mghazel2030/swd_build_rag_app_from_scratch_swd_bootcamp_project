/**
 * ================================================================
 * RAG from Scratch
 * Step 13: Production Express Server
 * ================================================================
 *
 * Responsibilities:
 *   - expose /health, /ingest, /query
 *   - preserve Step-11 RAG observability contract
 *   - serve the React production build from ../frontend/dist
 *   - support React SPA fallback routes
 *   - bind to 0.0.0.0 and Render's PORT in production
 * ================================================================
 */

import 'dotenv/config';

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import cors from 'cors';
import express from 'express';
import multer from 'multer';

import { generateAnswer } from './generate.js';
import { ingestDocument } from './ingest.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);

const DEFAULT_PORT = Number.parseInt(process.env.PORT || '3000', 10);
const DEFAULT_HOST = process.env.HOST || '0.0.0.0';
const UPLOAD_DIRECTORY = resolve(currentDirectory, 'uploads');
const DEFAULT_STORE_PATH = resolve(currentDirectory, 'store.json');
const FRONTEND_DIST_DIRECTORY = resolve(currentDirectory, '../frontend/dist');
const FRONTEND_INDEX_FILE = resolve(FRONTEND_DIST_DIRECTORY, 'index.html');
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

mkdirSync(UPLOAD_DIRECTORY, { recursive: true });

const allowedExtensions = new Set(['.pdf', '.txt']);

const upload = multer({
  dest: UPLOAD_DIRECTORY,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      callback(new Error('Only .pdf and .txt files are supported.'));
      return;
    }

    callback(null, true);
  },
});

export const app = express();

/*
 * CORS is useful for local split-server development.
 * In production the React app and API share one origin.
 */
if (process.env.CORS_ORIGIN) {
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
    }),
  );
}

app.use(
  express.json({
    limit: '1mb',
  }),
);

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'rag-from-scratch-backend',
    step: 13,
    environment: process.env.NODE_ENV || 'development',
    frontendBuilt: existsSync(FRONTEND_INDEX_FILE),
    storePath: DEFAULT_STORE_PATH,
    supportedFileTypes: ['.pdf', '.txt'],
  });
});

app.post(
  '/ingest',
  upload.single('file'),
  async (request, response, next) => {
    try {
      if (!request.file) {
        response.status(400).json({
          error: 'A file is required in multipart field "file".',
        });
        return;
      }

      const result = await ingestDocument({
        filePath: request.file.path,
        originalName: request.file.originalname,
        storePath: DEFAULT_STORE_PATH,
        deleteSourceAfter: true,
      });

      response.status(201).json({
        message: 'Document ingested successfully.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post('/query', async (request, response, next) => {
  try {
    const {
      question,
      topK = 3,
    } = request.body || {};

    if (typeof question !== 'string' || question.trim() === '') {
      response.status(400).json({
        error: 'Request body must contain a non-empty "question" string.',
      });
      return;
    }

    if (!Number.isInteger(topK) || topK <= 0 || topK > 10) {
      response.status(400).json({
        error: '"topK" must be an integer from 1 to 10.',
      });
      return;
    }

    const result = await generateAnswer(question, {
      topK,
      storePath: DEFAULT_STORE_PATH,
    });

    response.json({
      question: result.query,
      answer: result.answer,
      model: result.model,
      timings: result.timings,
      retrievedChunks: result.retrievedChunks.map((chunk, index) => ({
        rank: index + 1,
        chunkIndex: chunk.chunkIndex,
        source: chunk.source,
        score: chunk.score,
        text: chunk.text,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/* Serve the React production build when it exists. */
if (existsSync(FRONTEND_DIST_DIRECTORY)) {
  app.use(express.static(FRONTEND_DIST_DIRECTORY));

  /* SPA fallback for browser GET routes. */
  app.get('*', (request, response, next) => {
    if (
      request.path === '/health' ||
      request.path === '/ingest' ||
      request.path === '/query'
    ) {
      next();
      return;
    }

    response.sendFile(FRONTEND_INDEX_FILE);
  });
}

app.use((request, response) => {
  response.status(404).json({
    error: `Route not found: ${request.method} ${request.originalUrl}`,
  });
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error:
        error.code === 'LIMIT_FILE_SIZE'
          ? `Uploaded file exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit.`
          : error.message,
    });
    return;
  }

  if (
    error instanceof Error &&
    (
      error.message.includes('Only .pdf and .txt') ||
      error.message.includes('requires a non-empty')
    )
  ) {
    response.status(400).json({
      error: error.message,
    });
    return;
  }

  console.error('Unhandled API error:', error);

  response.status(500).json({
    error:
      error instanceof Error
        ? error.message
        : 'Internal server error.',
  });
});

export function startServer(
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
) {
  return app.listen(port, host, () => {
    console.log(`RAG backend listening on http://${host}:${port}`);
  });
}

const isDirectExecution =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  startServer();
}

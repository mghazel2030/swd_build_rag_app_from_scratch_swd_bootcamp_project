/**
 * ================================================================
 * RAG from Scratch - Core Pipeline
 * Step 7: Grounded Prompt Construction
 * ================================================================
 *
 * Implemented stages:
 *   Step 1: Plain-text ingestion
 *   Step 2: PDF ingestion
 *   Step 3: Chunking
 *   Step 4: Embeddings
 *   Step 5: Cosine similarity
 *   Step 6: Vector search
 *   Step 7: Grounded prompt construction
 *
 * Step 7 bridges RETRIEVAL and GENERATION:
 *
 *   user question
 *       |
 *       v
 *   search(query, k)
 *       |
 *       v
 *   top-K retrieved chunks
 *       |
 *       v
 *   buildSystemPrompt(chunks)
 *       |
 *       v
 *   grounded system prompt
 *
 * IMPORTANT:
 * Step 7 does not call an LLM yet. It only constructs and validates
 * the exact context that a later generation step will send to the LLM.
 * ================================================================
 */

import { existsSync, readFileSync } from 'node:fs';
import { PDFParse } from 'pdf-parse';

export const EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL ||
  'sentence-transformers/all-MiniLM-L6-v2';

export const DEFAULT_STORE_PATH =
  process.env.VECTOR_STORE_PATH ||
  './store.json';

const HF_EMBEDDING_URL =
  `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;

const DEFAULT_EMBEDDING_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

function validateFilePath(filePath, functionName) {
  if (
    typeof filePath !== 'string' ||
    filePath.trim() === ''
  ) {
    throw new TypeError(
      `${functionName}(filePath) requires a non-empty file path string.`,
    );
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function extractText(filePath) {
  validateFilePath(filePath, 'extractText');

  return readFileSync(filePath, 'utf8');
}

export async function extractTextFromPdf(filePath) {
  validateFilePath(
    filePath,
    'extractTextFromPdf',
  );

  const pdfBuffer =
    readFileSync(filePath);

  if (
    !Buffer.isBuffer(pdfBuffer) ||
    pdfBuffer.length === 0
  ) {
    throw new Error(
      'The PDF file could not be loaded into a non-empty Buffer.',
    );
  }

  const parser = new PDFParse({
    data: pdfBuffer,
  });

  try {
    const result =
      await parser.getText();

    if (
      !result ||
      typeof result.text !== 'string'
    ) {
      throw new Error(
        'PDF parsing completed without returning a text string.',
      );
    }

    if (
      result.text.trim().length === 0
    ) {
      throw new Error(
        'PDF parsing succeeded but produced empty text.',
      );
    }

    return result.text;
  } finally {
    await parser.destroy();
  }
}

export function chunkText(
  text,
  {
    size = 500,
    overlap = 50,
  } = {},
) {
  if (typeof text !== 'string') {
    throw new TypeError(
      'chunkText(text) requires text to be a string.',
    );
  }

  if (
    !Number.isInteger(size) ||
    size <= 0
  ) {
    throw new RangeError(
      'chunk size must be a positive integer.',
    );
  }

  if (
    !Number.isInteger(overlap) ||
    overlap < 0
  ) {
    throw new RangeError(
      'chunk overlap must be a non-negative integer.',
    );
  }

  if (overlap >= size) {
    throw new RangeError(
      'chunk overlap must be smaller than chunk size.',
    );
  }

  if (text.length === 0) {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end =
      Math.min(
        start + size,
        text.length,
      );

    chunks.push(
      text.slice(start, end),
    );

    if (end === text.length) {
      break;
    }

    start =
      end - overlap;
  }

  return chunks;
}

function normalizeEmbeddingResponse(data) {
  let vector = data;

  if (
    Array.isArray(vector) &&
    vector.length === 1 &&
    Array.isArray(vector[0])
  ) {
    vector = vector[0];
  }

  if (
    !Array.isArray(vector) ||
    vector.length === 0 ||
    !vector.every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value),
    )
  ) {
    throw new Error(
      'Hugging Face returned an unexpected embedding response shape.',
    );
  }

  return vector;
}

export async function embedText(
  text,
  {
    timeoutMs =
      DEFAULT_EMBEDDING_TIMEOUT_MS,
    maxRetries =
      DEFAULT_MAX_RETRIES,
  } = {},
) {
  if (
    typeof text !== 'string' ||
    text.trim() === ''
  ) {
    throw new TypeError(
      'embedText(text) requires a non-empty text string.',
    );
  }

  const apiKey =
    process.env.HF_API_KEY;

  if (
    typeof apiKey !== 'string' ||
    apiKey.trim() === ''
  ) {
    throw new Error(
      'Missing HF_API_KEY. Add your Hugging Face token to backend/.env.',
    );
  }

  let lastError;

  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt += 1
  ) {
    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(
        () => controller.abort(),
        timeoutMs,
      );

    try {
      const response =
        await fetch(
          HF_EMBEDDING_URL,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${apiKey}`,
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                inputs: text,
              }),
            signal:
              controller.signal,
          },
        );

      const responseText =
        await response.text();

      if (!response.ok) {
        const isTransient =
          response.status === 429 ||
          response.status >= 500;

        if (
          isTransient &&
          attempt < maxRetries
        ) {
          await sleep(
            1000 *
              (attempt + 1),
          );

          continue;
        }

        throw new Error(
          `Hugging Face embedding request failed (HTTP ${response.status} ${response.statusText}). ${responseText.slice(0, 500)}`,
        );
      }

      return normalizeEmbeddingResponse(
        JSON.parse(responseText),
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              String(error),
            );

      if (
        attempt >= maxRetries
      ) {
        break;
      }

      await sleep(
        1000 *
          (attempt + 1),
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

export function cosineSimilarity(a, b) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b)
  ) {
    throw new TypeError(
      'cosineSimilarity(a, b) requires two arrays.',
    );
  }

  if (
    a.length === 0 ||
    b.length === 0
  ) {
    throw new RangeError(
      'cosineSimilarity(a, b) requires non-empty vectors.',
    );
  }

  if (a.length !== b.length) {
    throw new RangeError(
      `Vector dimensions must match: received ${a.length} and ${b.length}.`,
    );
  }

  let dot = 0;
  let normASquared = 0;
  let normBSquared = 0;

  for (
    let i = 0;
    i < a.length;
    i += 1
  ) {
    if (
      typeof a[i] !== 'number' ||
      typeof b[i] !== 'number' ||
      !Number.isFinite(a[i]) ||
      !Number.isFinite(b[i])
    ) {
      throw new TypeError(
        'Cosine similarity vectors must contain only finite numbers.',
      );
    }

    dot +=
      a[i] * b[i];

    normASquared +=
      a[i] * a[i];

    normBSquared +=
      b[i] * b[i];
  }

  if (
    normASquared === 0 ||
    normBSquared === 0
  ) {
    throw new RangeError(
      'Cosine similarity is undefined for a zero-magnitude vector.',
    );
  }

  const score =
    dot /
    (
      Math.sqrt(normASquared) *
      Math.sqrt(normBSquared)
    );

  return Math.max(
    -1,
    Math.min(1, score),
  );
}

export function loadVectorStore(
  storePath = DEFAULT_STORE_PATH,
) {
  validateFilePath(
    storePath,
    'loadVectorStore',
  );

  if (!existsSync(storePath)) {
    throw new Error(
      `Vector store not found at "${storePath}". Run "npm run ingest" first.`,
    );
  }

  const parsed =
    JSON.parse(
      readFileSync(
        storePath,
        'utf8',
      ),
    );

  if (
    !parsed ||
    !Array.isArray(parsed.items) ||
    parsed.items.length === 0
  ) {
    throw new Error(
      'Vector store must contain a non-empty "items" array.',
    );
  }

  return parsed;
}

export async function search(
  query,
  k = 3,
  {
    storePath =
      DEFAULT_STORE_PATH,
  } = {},
) {
  if (
    typeof query !== 'string' ||
    query.trim() === ''
  ) {
    throw new TypeError(
      'search(query) requires a non-empty query string.',
    );
  }

  if (
    !Number.isInteger(k) ||
    k <= 0
  ) {
    throw new RangeError(
      'search k must be a positive integer.',
    );
  }

  const store =
    loadVectorStore(storePath);

  const queryEmbedding =
    await embedText(query);

  const scored =
    store.items.map(
      (item) => ({
        id: item.id,
        chunkIndex:
          item.chunkIndex,
        source:
          item.source,
        text:
          item.text,
        score:
          cosineSimilarity(
            queryEmbedding,
            item.embedding,
          ),
      }),
    );

  scored.sort(
    (a, b) =>
      b.score - a.score,
  );

  return scored.slice(
    0,
    Math.min(
      k,
      scored.length,
    ),
  );
}

/**
 * Build a grounded system prompt from retrieved chunks.
 *
 * The resulting prompt instructs the future LLM to:
 *   - answer only from retrieved evidence,
 *   - avoid unsupported claims,
 *   - explicitly admit when context is insufficient,
 *   - preserve the retrieved passages in a traceable numbered format.
 *
 * Input:
 *   Array of retrieved result objects from search().
 *
 * Output:
 *   One system-prompt string.
 *
 * @param {object[]} chunks - Retrieved top-K chunk objects.
 * @returns {string} Grounded system prompt.
 */
export function buildSystemPrompt(chunks) {
  if (!Array.isArray(chunks)) {
    throw new TypeError(
      'buildSystemPrompt(chunks) requires an array.',
    );
  }

  if (chunks.length === 0) {
    throw new RangeError(
      'buildSystemPrompt(chunks) requires at least one retrieved chunk.',
    );
  }

  const contextBlocks =
    chunks.map(
      (chunk, index) => {
        if (
          !chunk ||
          typeof chunk !== 'object'
        ) {
          throw new TypeError(
            `Retrieved chunk ${index} must be an object.`,
          );
        }

        if (
          typeof chunk.text !== 'string' ||
          chunk.text.trim() === ''
        ) {
          throw new TypeError(
            `Retrieved chunk ${index} must contain non-empty text.`,
          );
        }

        const source =
          typeof chunk.source ===
            'string' &&
          chunk.source.trim() !== ''
            ? chunk.source
            : 'unknown source';

        const chunkIndex =
          Number.isInteger(
            chunk.chunkIndex,
          )
            ? chunk.chunkIndex
            : index;

        const score =
          typeof chunk.score ===
            'number' &&
          Number.isFinite(
            chunk.score,
          )
            ? chunk.score.toFixed(6)
            : 'n/a';

        return [
          `[CONTEXT ${index + 1}]`,
          `Source: ${source}`,
          `Chunk: ${chunkIndex}`,
          `Retrieval score: ${score}`,
          '',
          chunk.text.trim(),
        ].join('\n');
      },
    )
      .join(
        '\n\n---\n\n',
      );

  return [
    'You are a grounded question-answering assistant.',
    '',
    'Answer the user using ONLY the retrieved context below.',
    'Do not use outside knowledge to fill missing information.',
    'If the retrieved context does not contain enough information to answer the question, say: "I do not know based on the provided context."',
    'Keep the answer concise and faithful to the retrieved evidence.',
    'When useful, refer to the source/chunk information supplied in the context.',
    '',
    'RETRIEVED CONTEXT',
    '=================',
    '',
    contextBlocks,
  ].join('\n');
}

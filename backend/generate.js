/**
 * RAG from Scratch - Step 11
 * Generation orchestration with timing observability.
 */
import 'dotenv/config';
import { buildSystemPrompt, search } from './pipeline.js';

export const GENERATION_MODEL =
  process.env.OPENROUTER_MODEL || 'openrouter/free';

const OPENROUTER_URL =
  'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_TOP_K = 3;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function nowMs() {
  return performance.now();
}

function roundMs(milliseconds) {
  return Math.round(milliseconds);
}

function extractAssistantText(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('OpenRouter returned no usable assistant message.');
  }

  return content.trim();
}

export async function callGenerationModel(
  systemPrompt,
  query,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    temperature = 0,
  } = {},
) {
  if (typeof systemPrompt !== 'string' || systemPrompt.trim() === '') {
    throw new TypeError(
      'callGenerationModel() requires a non-empty system prompt.',
    );
  }

  if (typeof query !== 'string' || query.trim() === '') {
    throw new TypeError(
      'callGenerationModel() requires a non-empty query.',
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error(
      'Missing OPENROUTER_API_KEY. Add it to backend/.env.',
    );
  }

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

    try {
      const response = await fetch(
        OPENROUTER_URL,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: GENERATION_MODEL,
            temperature,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query },
            ],
          }),
          signal: controller.signal,
        },
      );

      const responseText = await response.text();

      if (!response.ok) {
        const isTransient =
          response.status === 429 ||
          response.status >= 500;

        if (isTransient && attempt < maxRetries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }

        throw new Error(
          `OpenRouter generation request failed (HTTP ${response.status} ${response.statusText}). ${responseText.slice(0, 700)}`,
        );
      }

      const data = JSON.parse(responseText);

      return {
        answer: extractAssistantText(data),
        model:
          typeof data.model === 'string'
            ? data.model
            : GENERATION_MODEL,
      };
    } catch (error) {
      const normalized =
        error instanceof Error
          ? error
          : new Error(String(error));

      lastError =
        normalized.name === 'AbortError'
          ? new Error(
              `OpenRouter generation request timed out after ${timeoutMs} ms.`,
            )
          : normalized;

      if (attempt >= maxRetries) {
        break;
      }

      await sleep(1000 * (attempt + 1));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error('OpenRouter generation request failed.');
}

export async function generateAnswer(
  query,
  {
    topK = DEFAULT_TOP_K,
    storePath,
  } = {},
) {
  if (typeof query !== 'string' || query.trim() === '') {
    throw new TypeError(
      'generateAnswer(query) requires a non-empty query string.',
    );
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    throw new RangeError(
      'generateAnswer topK must be a positive integer.',
    );
  }

  const totalStart = nowMs();

  const retrievalStart = nowMs();
  const retrievedChunks = await search(
    query,
    topK,
    storePath ? { storePath } : {},
  );
  const retrievalMs = roundMs(nowMs() - retrievalStart);

  const promptStart = nowMs();
  const systemPrompt = buildSystemPrompt(retrievedChunks);
  const promptConstructionMs = roundMs(nowMs() - promptStart);

  const generationStart = nowMs();
  const generation = await callGenerationModel(
    systemPrompt,
    query,
  );
  const generationMs = roundMs(nowMs() - generationStart);

  return {
    query: query.trim(),
    answer: generation.answer,
    model: generation.model,
    retrievedChunks,
    systemPrompt,
    timings: {
      retrievalMs,
      promptConstructionMs,
      generationMs,
      totalMs: roundMs(nowMs() - totalStart),
    },
  };
}

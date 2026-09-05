/**
 * ================================================================
 * RAG from Scratch
 * Step 13: Environment-Agnostic Frontend API Client
 * ================================================================
 *
 * Development:
 *   relative URLs are proxied by Vite to http://localhost:3000
 *
 * Production:
 *   relative URLs are served by the same Express origin
 * ================================================================
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '';

async function parseJsonResponse(response) {
  let body;

  try {
    body = await response.json();
  } catch {
    throw new Error(
      `Backend returned a non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      body?.error ||
      `Backend request failed with HTTP ${response.status}.`,
    );
  }

  return body;
}

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseJsonResponse(response);
}

export async function ingestFile(file) {
  if (!(file instanceof File)) {
    throw new TypeError(
      'ingestFile(file) requires a browser File object.',
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/ingest`,
    {
      method: 'POST',
      body: formData,
    },
  );

  return parseJsonResponse(response);
}

export async function queryRag(question, topK = 3) {
  if (typeof question !== 'string' || question.trim() === '') {
    throw new TypeError(
      'queryRag(question) requires a non-empty question.',
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question.trim(),
        topK,
      }),
    },
  );

  return parseJsonResponse(response);
}

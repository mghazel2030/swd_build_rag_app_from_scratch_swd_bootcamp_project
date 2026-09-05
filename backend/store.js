/**
 * RAG from Scratch - Step 6
 * JSON vector-store persistence helper.
 */
import { writeFileSync } from 'node:fs';

export function saveVectorStore(filePath, vectorStore) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new TypeError('saveVectorStore() requires a non-empty file path.');
  }

  if (!vectorStore || typeof vectorStore !== 'object' || !Array.isArray(vectorStore.items)) {
    throw new TypeError('saveVectorStore() requires an object with an items array.');
  }

  writeFileSync(filePath, JSON.stringify(vectorStore, null, 2), 'utf8');
}

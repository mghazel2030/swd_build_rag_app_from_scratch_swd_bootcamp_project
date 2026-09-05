# RAG from Scratch — End-to-End Full-Stack RAG Application

## Overview

This project is a complete, end-to-end Retrieval-Augmented Generation (RAG) application built progressively from first principles.

The application demonstrates how a document can be:

1. ingested,
2. converted to text,
3. split into overlapping chunks,
4. embedded into vectors,
5. stored in a lightweight vector store,
6. searched using cosine similarity,
7. converted into grounded LLM context,
8. answered through a generation model,
9. exposed through a backend API,
10. integrated into a React frontend,
11. enhanced with observability and UX features, and
12. prepared for CI/CD and production deployment.

The implementation intentionally avoids hiding the core RAG mechanics behind a high-level framework so the complete retrieval and generation pipeline remains visible, testable, and understandable.

---

## Application Architecture

```text
                              ┌──────────────────────────────┐
                              │          React UI            │
                              │                              │
                              │ Upload document              │
                              │ Ask questions                │
                              │ Inspect evidence             │
                              │ View RAG timings             │
                              └──────────────┬───────────────┘
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │      Express REST API        │
                              │                              │
                              │ GET  /health                 │
                              │ POST /ingest                 │
                              │ POST /query                  │
                              └──────────────┬───────────────┘
                                             │
                     ┌───────────────────────┴────────────────────────┐
                     │                                                │
                     ▼                                                ▼
        ┌──────────────────────────┐                    ┌──────────────────────────┐
        │   Document Ingestion     │                    │      Query Pipeline      │
        │                          │                    │                          │
        │ TXT / PDF extraction     │                    │ Query embedding          │
        │ Chunking                 │                    │ Vector search            │
        │ Embeddings               │                    │ Cosine similarity        │
        │ store.json               │                    │ Top-K retrieval          │
        └──────────────────────────┘                    └─────────────┬────────────┘
                                                                    │
                                                                    ▼
                                                       ┌──────────────────────────┐
                                                       │ Grounded Prompt Builder  │
                                                       └─────────────┬────────────┘
                                                                    │
                                                                    ▼
                                                       ┌──────────────────────────┐
                                                       │   OpenRouter LLM         │
                                                       │   Grounded Generation    │
                                                       └─────────────┬────────────┘
                                                                    │
                                                                    ▼
                                                       ┌──────────────────────────┐
                                                       │ Answer + Evidence +      │
                                                       │ Timing Diagnostics       │
                                                       └──────────────────────────┘
```

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript / JSX
- CSS
- Vitest
- React Testing Library
- jsdom

### Backend

- Node.js
- Express
- Multer
- CORS
- dotenv
- pdf-parse

### AI / RAG

- Hugging Face Inference API
- `sentence-transformers/all-MiniLM-L6-v2`
- 384-dimensional embeddings
- cosine similarity
- brute-force vector search
- grounded prompt construction
- OpenRouter chat-completion API

### DevOps

- Git
- GitHub
- GitHub Actions
- Render
- CI/CD
- production React build served by Express

---

# Step-by-Step Development Process

The project was intentionally developed in small, verifiable stages.

## Step 1 — Plain-Text Ingestion

Implemented basic text-file loading.

```text
TXT
 ↓
plain text
```

Primary goal:

- establish the first ingestion primitive,
- validate file reading,
- separate document acquisition from later RAG logic.

---

## Step 2 — PDF Ingestion

Added PDF parsing using `pdf-parse`.

```text
PDF
 ↓
text extraction
 ↓
plain text
```

Key learning:

- document ingestion can fail independently from downstream RAG logic,
- extracted text must be explicitly validated before processing.

---

## Step 3 — Chunking

Implemented overlapping fixed-size chunking.

```text
document text
     ↓
chunk 1
chunk 2
chunk 3
...
```

Chunking configuration:

```text
Chunk size    : 500 characters
Chunk overlap : 50 characters
```

Key learning:

- chunk size directly affects retrieval granularity,
- overlap helps preserve semantic continuity across chunk boundaries.

---

## Step 4 — Embeddings

Integrated Hugging Face embeddings.

```text
text chunk
    ↓
embedding model
    ↓
384-dimensional vector
```

Embedding model:

```text
sentence-transformers/all-MiniLM-L6-v2
```

Key learning:

- embeddings transform semantic text into a mathematical representation,
- embedding dimensions must remain consistent between indexed chunks and queries.

---

## Step 5 — Cosine Similarity

Implemented similarity scoring manually.

```text
query vector
      +
chunk vector
      ↓
cosine similarity
      ↓
relevance score
```

This step made vector retrieval mathematically transparent rather than hiding the logic behind a vector database.

---

## Step 6 — Vector Search

Connected embeddings and cosine similarity into a complete search pipeline.

```text
query
  ↓
query embedding
  ↓
compare with all stored vectors
  ↓
sort by cosine similarity
  ↓
Top-K chunks
```

A JSON-based vector store was introduced:

```text
store.json
```

Each record contains:

- chunk ID,
- chunk index,
- source,
- text,
- embedding.

---

## Step 7 — Grounded Prompt Construction

Converted retrieved chunks into controlled LLM context.

```text
Top-K chunks
    ↓
grounding instructions
    ↓
system prompt
```

The prompt explicitly instructs the model to:

- use only retrieved context,
- avoid unsupported information,
- admit when the answer cannot be found in the supplied evidence.

---

## Step 8 — Full RAG Generation Flow

Completed the core RAG loop.

```text
query
  ↓
embedding
  ↓
retrieval
  ↓
Top-K evidence
  ↓
grounded prompt
  ↓
OpenRouter
  ↓
grounded answer
```

This completed all three parts of RAG:

```text
Retrieval
Augmentation
Generation
```

---

## Step 9 — Backend API Integration

Converted the RAG engine into an Express REST API.

Implemented:

```text
GET  /health
POST /ingest
POST /query
```

The backend now supports:

- PDF/TXT upload,
- ingestion,
- vector-store generation,
- RAG querying,
- validation,
- JSON error handling.

---

## Step 10 — React Frontend Integration

Connected the verified backend to a React/Vite frontend.

Features added:

- document upload,
- ingestion status,
- question input,
- configurable Top-K retrieval,
- grounded answer display,
- generation-model display,
- retrieved evidence display,
- cosine-score visualization,
- backend-health status.

---

## Step 11 — RAG Observability & UX Refinement

Enhanced the application for debugging, analysis, and usability.

Added:

- multi-turn Q&A history,
- collapsible evidence panels,
- retrieval rank,
- source,
- chunk index,
- cosine score,
- retrieval latency,
- prompt-construction latency,
- generation latency,
- total RAG latency,
- improved loading states,
- accessible live regions,
- responsive UX refinements.

---

## Final Production Stage — GitHub CI/CD & Render

Prepared the application for production deployment.

Production architecture:

```text
React source
    ↓
Vite production build
    ↓
frontend/dist
    ↓
Express static serving
    +
Express RAG API
    ↓
one production Node.js service
```

Git workflow:

```text
feature/rag-app-final-version
            ↓
         develop
            ↓
           main
            ↓
     Render deployment
```

CI workflow validates:

- backend deterministic smoke tests,
- frontend automated tests,
- frontend production build.

Render deployment uses:

- one Node Web Service,
- `/health` endpoint,
- GitHub-connected auto-deploy,
- environment variables for API keys,
- production React assets served by Express.

---

# Application Features

## Document Ingestion

The application supports:

- plain-text files,
- PDF documents,
- browser-based file upload,
- automatic temporary-upload cleanup.

## Text Processing

- PDF-to-text extraction
- fixed-size chunking
- configurable chunk overlap
- chunk metadata

## Embeddings

- Hugging Face embedding API
- configurable embedding model
- validated numeric vectors
- dimension consistency

## Vector Search

- query embeddings
- cosine similarity
- descending relevance ranking
- configurable Top-K retrieval

## Grounded Generation

- retrieved-document context
- explicit grounding policy
- insufficient-context fallback
- OpenRouter generation

## Backend API

- health endpoint
- ingestion endpoint
- query endpoint
- request validation
- JSON error handling
- upload limits
- supported-file validation

## Frontend

- responsive React interface
- backend status
- file ingestion
- question submission
- Top-K selector
- grounded answer rendering
- retrieval-evidence visualization
- model information

## Observability

Each RAG turn can expose:

```text
Retrieval time
Prompt-construction time
Generation time
Total request time
```

Each retrieved chunk exposes:

```text
Rank
Chunk index
Source
Cosine similarity
Text evidence
```

## Q&A Session History

- multiple questions can be compared in one browser session,
- each answer keeps its own evidence and timings,
- history can be cleared,
- history is automatically reset when a new document is indexed.

## Testing

The project includes progressively developed tests for:

- ingestion,
- PDF extraction,
- chunking,
- embeddings,
- cosine similarity,
- vector search,
- prompt construction,
- full RAG generation,
- API integration,
- frontend integration,
- observability,
- deterministic CI smoke testing.

---

# Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── backend/
│   ├── .env.example
│   ├── generate.js
│   ├── index.js
│   ├── ingest.js
│   ├── pipeline.js
│   ├── store.js
│   ├── store.json
│   ├── test-ci.js
│   ├── test-step-01.js
│   ├── ...
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── App.test.jsx
│   │   ├── main.jsx
│   │   └── testSetup.js
│   │
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
├── package.json
├── render.yaml
└── README.md
```

---

# Local Development

## Backend

```powershell
cd backend
npm install
npm start
```

Default:

```text
http://localhost:3000
```

## Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Default:

```text
http://localhost:5173
```

Vite proxies the API routes to the Express backend.

---

# Local Production Verification

From the project root:

```powershell
npm install --prefix backend
npm install --prefix frontend

npm run test:ci --prefix backend
npm run test:run --prefix frontend
npm run build --prefix frontend
```

Then run only the production Express server:

```powershell
npm start --prefix backend
```

Open:

```text
http://localhost:3000
```

In production mode, Express serves:

```text
React production bundle
+
RAG REST API
```

from the same origin.

---

# Environment Variables

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

Required values include:

```text
HF_API_KEY
HF_EMBEDDING_MODEL

OPENROUTER_API_KEY
OPENROUTER_MODEL
```

Never commit real API keys.

---

# Automated Testing

## Backend deterministic CI test

```powershell
npm run test:ci --prefix backend
```

## Frontend

```powershell
npm run test:run --prefix frontend
```

## Production frontend build

```powershell
npm run build --prefix frontend
```

## Full root verification

```powershell
npm run verify
```

---

# Git & CI/CD Workflow

Recommended branch flow:

```text
feature/*
   ↓
develop
   ↓
main
   ↓
Render
```

Pull requests should pass:

```text
backend-ci
frontend-ci
```

before merging.

GitHub Actions is configured under:

```text
.github/workflows/ci.yml
```

---

# Deployment

The final deployment uses a single Render Web Service.

Render:

1. installs backend dependencies,
2. installs frontend dependencies,
3. builds the React production bundle,
4. starts Express,
5. checks `/health`,
6. serves React and the RAG API from the same application URL.

Deployment configuration:

```text
render.yaml
```

---

# Key Lessons Learned

## 1. RAG Is a Pipeline, Not a Single Algorithm

A successful RAG application depends on every stage:

```text
ingestion
chunking
embedding
retrieval
prompting
generation
```

A failure in any upstream stage can affect the final answer.

---

## 2. Retrieval Quality Is Fundamental

A capable LLM cannot produce a grounded answer if relevant evidence is not retrieved.

Debugging RAG therefore begins by examining:

```text
retrieved chunks
ranking
similarity scores
```

before changing the generation model.

---

## 3. Chunking Is an Important Design Parameter

Chunk size and overlap affect:

- semantic completeness,
- retrieval precision,
- context quality,
- number of embeddings,
- inference cost.

---

## 4. Embeddings and Generation Are Different Tasks

The embedding model determines semantic retrieval.

The generation model determines answer synthesis.

They solve different parts of the system and should be evaluated independently.

---

## 5. Grounding Requires Explicit Prompt Design

Retrieved evidence alone does not guarantee grounded generation.

The system prompt must clearly instruct the model to:

- rely only on context,
- avoid unsupported information,
- acknowledge insufficient evidence.

---

## 6. Observability Makes RAG Debuggable

Displaying only the final answer hides the most important engineering information.

Showing:

```text
source
chunk
score
retrieval latency
generation latency
```

makes it possible to reason about system behavior.

---

## 7. Deterministic Tests and Live Integration Tests Should Be Separated

CI should not depend exclusively on external AI services.

The final workflow therefore distinguishes:

- deterministic tests suitable for every GitHub Actions run,
- live Hugging Face/OpenRouter tests used for integration verification.

---

## 8. Development and Production Topologies Can Differ

During development:

```text
Vite
+
Express
```

are conveniently run separately.

In production:

```text
Vite build
+
Express static serving
```

allows the complete full-stack application to run as one service.

---

## 9. API Keys Must Remain Server-Side

AI-provider credentials belong in backend environment variables and must never be exposed to the React application or committed to Git.

---

## 10. Build Incrementally and Test Every Stage

Developing the project step-by-step made failures easier to isolate.

Instead of debugging:

```text
PDF → RAG → React → production
```

as one large black box, every stage was proven individually before the next layer was added.

---

# Limitations

The current implementation is intentionally educational and lightweight.

Important limitations include:

- JSON-file vector storage,
- brute-force vector search,
- one active document/vector store at a time,
- browser-session-only Q&A history,
- no authentication,
- no user accounts,
- no persistent conversational memory,
- no production-grade distributed tracing,
- runtime vector-store persistence depends on deployment storage.

---

# Future Work

## Persistent Vector Storage

Replace:

```text
store.json
```

with a persistent vector solution such as:

- PostgreSQL + pgvector
- Qdrant
- Pinecone
- Weaviate
- Milvus
- Elasticsearch vector search

---

## Multi-Document Knowledge Base

Add:

- multiple documents,
- document IDs,
- metadata filters,
- re-indexing,
- deletion,
- source management.

---

## Improved Chunking

Explore:

- sentence-aware chunking,
- paragraph-aware chunking,
- semantic chunking,
- recursive text splitting,
- document-structure-aware segmentation.

---

## Retrieval Improvements

Add:

- relevance thresholds,
- hybrid lexical + vector search,
- metadata filtering,
- reranking,
- Maximum Marginal Relevance,
- approximate nearest-neighbor indexing.

---

## Conversational RAG

Extend UI history into real conversational context:

```text
previous questions
+
previous answers
+
current query
```

while preventing irrelevant conversation history from degrading retrieval.

---

## Persistent Chat History

Store conversations in a database so sessions survive:

- browser refresh,
- server restart,
- user logout/login.

---

## Citations

Generate explicit answer citations that map statements back to:

```text
document
chunk
page
```

where reliable page metadata is available.

---

## Streaming Generation

Stream tokens from the generation API so users see the answer progressively rather than waiting for the complete response.

---

## RAG Evaluation

Add systematic evaluation for:

- retrieval recall,
- retrieval precision,
- answer relevance,
- faithfulness,
- grounding,
- latency.

---

## Production Observability

Add:

- structured logging,
- request IDs,
- distributed tracing,
- OpenTelemetry,
- latency percentiles,
- failure-rate monitoring,
- provider-level metrics.

---

## Security

Add:

- authentication,
- authorization,
- rate limiting,
- stricter CORS,
- upload malware/type validation,
- prompt-injection mitigation,
- API usage controls.

---

## Persistent Production Storage

The default Render filesystem is not intended as durable vector-store storage.

A production evolution should use:

- persistent disk storage,
- managed database storage, or
- a managed vector database.

---

## CI/CD Enhancements

Future CI/CD improvements can include:

- linting,
- coverage thresholds,
- dependency scanning,
- security scanning,
- preview deployments,
- environment-specific deployment workflows,
- production smoke tests.

---

# Author

**M Ghazel**

Software Development Bootcamp Project  
Full-Stack AI — Retrieval-Augmented Generation

Project focus:

- full-stack software development,
- Retrieval-Augmented Generation,
- AI application architecture,
- vector search,
- React,
- Node.js / Express,
- testing,
- observability,
- CI/CD,
- production deployment.

---

# Final Project Summary

This project demonstrates the complete evolution of a RAG application from fundamental algorithms to an interactive full-stack production architecture.

The final system implements:

```text
Document
   ↓
Text Extraction
   ↓
Chunking
   ↓
Embeddings
   ↓
Vector Store
   ↓
Semantic Search
   ↓
Grounded Context
   ↓
LLM Generation
   ↓
Express API
   ↓
React UI
   ↓
Evidence + Observability
   ↓
Automated Testing
   ↓
GitHub CI/CD
   ↓
Render Deployment
```

The primary value of the project is not only that the final application works, but that each component of the RAG system was developed, tested, inspected, and understood independently before being integrated into the final end-to-end application.

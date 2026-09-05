import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  API_BASE_URL,
  getHealth,
  ingestFile,
  queryRag,
} from './api.js';

import './App.css';

const DEFAULT_TOP_K = 3;

function formatScore(score) {
  return Number.isFinite(score)
    ? score.toFixed(4)
    : 'n/a';
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) {
    return 'n/a';
  }

  if (milliseconds < 1000) {
    return `${milliseconds} ms`;
  }

  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function createTurnId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [backendStatus, setBackendStatus] = useState({
    state: 'checking',
    message: 'Checking backend connection...',
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const [ingestState, setIngestState] = useState({
    loading: false,
    error: '',
    result: null,
  });

  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(DEFAULT_TOP_K);

  const [queryState, setQueryState] = useState({
    loading: false,
    error: '',
  });

  const [history, setHistory] = useState([]);
  const answerRegionRef = useRef(null);

  const latestTurn = useMemo(
    () => history.at(-1) || null,
    [history],
  );

  const canIngest =
    Boolean(selectedFile) &&
    !ingestState.loading;

  const canQuery =
    question.trim().length > 0 &&
    !queryState.loading;

  async function checkBackend() {
    setBackendStatus({
      state: 'checking',
      message: 'Checking backend connection...',
    });

    try {
      const health = await getHealth();

      setBackendStatus({
        state: 'online',
        message: `Backend online — Step ${health.step}`,
      });
    } catch (error) {
      setBackendStatus({
        state: 'offline',
        message:
          error instanceof Error
            ? error.message
            : 'Backend is unavailable.',
      });
    }
  }

  useEffect(() => {
    checkBackend();
  }, []);

  useEffect(() => {
    if (latestTurn && answerRegionRef.current) {
      answerRegionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [latestTurn]);

  function handleFileChange(event) {
    const file = event.target.files?.item(0) || null;

    setSelectedFile(file);

    setIngestState({
      loading: false,
      error: '',
      result: null,
    });
  }

  async function handleIngest(event) {
    event.preventDefault();

    if (!selectedFile) {
      setIngestState({
        loading: false,
        error: 'Choose a PDF or TXT file first.',
        result: null,
      });
      return;
    }

    setIngestState({
      loading: true,
      error: '',
      result: null,
    });

    try {
      const result = await ingestFile(selectedFile);

      setIngestState({
        loading: false,
        error: '',
        result,
      });

      // A new vector store invalidates previous answer provenance.
      setHistory([]);
    } catch (error) {
      setIngestState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Document ingestion failed.',
        result: null,
      });
    }
  }

  async function handleQuery(event) {
    event.preventDefault();

    const normalizedQuestion = question.trim();

    if (!normalizedQuestion) {
      setQueryState({
        loading: false,
        error: 'Enter a question before submitting.',
      });
      return;
    }

    setQueryState({
      loading: true,
      error: '',
    });

    try {
      const result = await queryRag(
        normalizedQuestion,
        topK,
      );

      setHistory((current) => [
        ...current,
        {
          id: createTurnId(),
          askedAt: new Date().toISOString(),
          question: result.question,
          answer: result.answer,
          model: result.model,
          timings: result.timings || {},
          retrievedChunks: result.retrievedChunks || [],
        },
      ]);

      setQuestion('');

      setQueryState({
        loading: false,
        error: '',
      });
    } catch (error) {
      setQueryState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'RAG query failed.',
      });
    }
  }

  return (
    <div className="appShell">
      <header className="hero">
        <div>
          <p className="eyebrow">
            Full-Stack AI · RAG from Scratch
          </p>

          <h1>RAG Explorer</h1>

          <p className="heroDescription">
            Ingest a document, ask grounded questions,
            inspect evidence, and observe where latency occurs
            across the RAG pipeline.
          </p>
        </div>

        <div
          className={`statusBadge statusBadge--${backendStatus.state}`}
          role="status"
          aria-live="polite"
        >
          {backendStatus.message}
        </div>
      </header>

      <main className="mainGrid">
        <aside className="leftRail">
          <section className="panel" aria-labelledby="ingest-heading">
            <p className="stepLabel">Document pipeline</p>
            <h2 id="ingest-heading">1. Ingest</h2>

            <form className="stack" onSubmit={handleIngest}>
              <label className="fieldLabel" htmlFor="document-file">
                PDF or TXT document
              </label>

              <input
                id="document-file"
                className="fileInput"
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleFileChange}
              />

              {selectedFile && (
                <div
                  className="selectedFile"
                  data-testid="selected-file"
                >
                  <strong>Selected:</strong>{' '}
                  {selectedFile.name}{' · '}
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              )}

              <button
                className="primaryButton"
                type="submit"
                disabled={!canIngest}
              >
                {ingestState.loading
                  ? 'Embedding document...'
                  : 'Upload & Ingest'}
              </button>
            </form>

            {ingestState.loading && (
              <p className="liveMessage" role="status" aria-live="polite">
                Extracting, chunking, embedding, and rebuilding the vector store.
              </p>
            )}

            {ingestState.error && (
              <div className="message message--error" role="alert">
                {ingestState.error}
              </div>
            )}

            {ingestState.result && (
              <div className="message message--success" role="status">
                <strong>Document indexed.</strong>

                <dl className="metadataGrid">
                  <div>
                    <dt>Source</dt>
                    <dd>{ingestState.result.source}</dd>
                  </div>

                  <div>
                    <dt>Chunks</dt>
                    <dd>{ingestState.result.totalChunks}</dd>
                  </div>

                  <div>
                    <dt>Dimensions</dt>
                    <dd>{ingestState.result.embeddingDimension}</dd>
                  </div>

                  <div>
                    <dt>Chunking</dt>
                    <dd>
                      {ingestState.result.chunkSize}
                      {' / '}
                      {ingestState.result.chunkOverlap}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </section>

          <section className="panel" aria-labelledby="query-heading">
            <p className="stepLabel">Retrieval + generation</p>
            <h2 id="query-heading">2. Ask</h2>

            <form className="stack" onSubmit={handleQuery}>
              <label className="fieldLabel" htmlFor="question">
                Question
              </label>

              <textarea
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows="5"
                placeholder="Example: What does the AI Systems in Production module teach?"
              />

              <label className="fieldLabel" htmlFor="top-k">
                Retrieval depth
              </label>

              <select
                id="top-k"
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option value={value} key={value}>
                    Top {value}
                  </option>
                ))}
              </select>

              <button
                className="primaryButton"
                type="submit"
                disabled={!canQuery}
              >
                {queryState.loading
                  ? 'Retrieving & generating...'
                  : 'Ask RAG'}
              </button>
            </form>

            {queryState.loading && (
              <p className="liveMessage" role="status" aria-live="polite">
                Embedding the query, retrieving evidence, and generating a grounded answer.
              </p>
            )}

            {queryState.error && (
              <div className="message message--error" role="alert">
                {queryState.error}
              </div>
            )}
          </section>
        </aside>

        <section
          className="panel historyPanel"
          aria-labelledby="history-heading"
        >
          <div className="historyHeader">
            <div>
              <p className="stepLabel">Conversation observability</p>
              <h2 id="history-heading">3. Question & Answer History</h2>
            </div>

            <div className="historyActions">
              <span className="turnCount">
                {history.length}{' '}
                {history.length === 1 ? 'turn' : 'turns'}
              </span>

              <button
                type="button"
                className="secondaryButton"
                onClick={() => setHistory([])}
                disabled={history.length === 0}
              >
                Clear history
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="emptyState">
              <h3>No questions yet</h3>
              <p>
                Submit a question to see the answer,
                retrieved evidence, similarity scores,
                and timing diagnostics.
              </p>
            </div>
          ) : (
            <div
              className="historyList"
              ref={answerRegionRef}
              aria-live="polite"
            >
              {history.map((turn, turnIndex) => (
                <article className="turnCard" key={turn.id}>
                  <div className="turnHeader">
                    <div>
                      <p className="turnIndex">
                        Turn {turnIndex + 1}
                      </p>
                      <h3>{turn.question}</h3>
                    </div>

                    <span className="modelPill">
                      {turn.model}
                    </span>
                  </div>

                  <div className="answerBlock">
                    <p className="stepLabel">Grounded answer</p>
                    <p className="answerText">{turn.answer}</p>
                  </div>

                  <section
                    className="timings"
                    aria-label="RAG timing diagnostics"
                  >
                    <div>
                      <span>Retrieval</span>
                      <strong>
                        {formatDuration(turn.timings?.retrievalMs)}
                      </strong>
                    </div>

                    <div>
                      <span>Prompt</span>
                      <strong>
                        {formatDuration(
                          turn.timings?.promptConstructionMs,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Generation</span>
                      <strong>
                        {formatDuration(turn.timings?.generationMs)}
                      </strong>
                    </div>

                    <div>
                      <span>Total</span>
                      <strong>
                        {formatDuration(turn.timings?.totalMs)}
                      </strong>
                    </div>
                  </section>

                  <details className="evidenceDisclosure">
                    <summary>
                      Retrieved evidence · {turn.retrievedChunks.length} chunks
                    </summary>

                    <div className="sourceList">
                      {turn.retrievedChunks.map((chunk, index) => (
                        <article
                          className="sourceCard"
                          key={`${turn.id}-${chunk.chunkIndex}-${index}`}
                        >
                          <div className="sourceMeta">
                            <span>
                              Rank {chunk.rank ?? index + 1}
                            </span>
                            <span>Chunk {chunk.chunkIndex}</span>
                            <span>
                              Score {formatScore(chunk.score)}
                            </span>
                          </div>

                          <p className="sourceName">{chunk.source}</p>
                          <p className="sourceText">{chunk.text}</p>
                        </article>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>Backend: {API_BASE_URL}</span>

        <button
          type="button"
          className="textButton"
          onClick={checkBackend}
        >
          Recheck backend
        </button>
      </footer>
    </div>
  );
}

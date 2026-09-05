import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  cleanup,
  render,
  screen,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import App from './App.jsx';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('Step 11 observability and UX', () => {
  it('renders timing diagnostics', async () => {
    fetch
      .mockImplementationOnce(() =>
        jsonResponse({ status: 'ok', step: 11 }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          question: 'What is RAG?',
          answer: 'RAG retrieves evidence before generation.',
          model: 'test-model',
          timings: {
            retrievalMs: 125,
            promptConstructionMs: 2,
            generationMs: 1800,
            totalMs: 1927,
          },
          retrievedChunks: [],
        }),
      );

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/Backend online — Step 11/i);

    await user.type(
      screen.getByLabelText(/^Question$/i),
      'What is RAG?',
    );

    await user.click(
      screen.getByRole('button', { name: /Ask RAG/i }),
    );

    expect(
      await screen.findByText(
        'RAG retrieves evidence before generation.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByText('125 ms')).toBeInTheDocument();
    expect(screen.getByText('1.80 s')).toBeInTheDocument();
    expect(screen.getByText('1.93 s')).toBeInTheDocument();
  });

  it('preserves multiple turns', async () => {
    fetch
      .mockImplementationOnce(() =>
        jsonResponse({ status: 'ok', step: 11 }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          question: 'Question one',
          answer: 'Answer one',
          model: 'model-a',
          timings: {},
          retrievedChunks: [],
        }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          question: 'Question two',
          answer: 'Answer two',
          model: 'model-b',
          timings: {},
          retrievedChunks: [],
        }),
      );

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/Backend online/i);

    const textarea = screen.getByLabelText(/^Question$/i);

    await user.type(textarea, 'Question one');
    await user.click(
      screen.getByRole('button', { name: /Ask RAG/i }),
    );
    await screen.findByText('Answer one');

    await user.type(textarea, 'Question two');
    await user.click(
      screen.getByRole('button', { name: /Ask RAG/i }),
    );

    expect(await screen.findByText('Answer two')).toBeInTheDocument();
    expect(screen.getByText('Answer one')).toBeInTheDocument();
    expect(screen.getByText('2 turns')).toBeInTheDocument();
  });

  it('shows retrieved evidence and score', async () => {
    fetch
      .mockImplementationOnce(() =>
        jsonResponse({ status: 'ok', step: 11 }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          question: 'What is RAG?',
          answer: 'Grounded answer',
          model: 'test-model',
          timings: {},
          retrievedChunks: [
            {
              rank: 1,
              chunkIndex: 2,
              source: 'guide.pdf',
              score: 0.75,
              text: 'Evidence text',
            },
          ],
        }),
      );

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/Backend online/i);

    await user.type(
      screen.getByLabelText(/^Question$/i),
      'What is RAG?',
    );

    await user.click(
      screen.getByRole('button', { name: /Ask RAG/i }),
    );

    expect(
      await screen.findByText(/Retrieved evidence · 1 chunks/i),
    ).toBeInTheDocument();

    expect(screen.getByText('Evidence text')).toBeInTheDocument();
    expect(screen.getByText(/Score 0.7500/i)).toBeInTheDocument();
  });

  it('clears history', async () => {
    fetch
      .mockImplementationOnce(() =>
        jsonResponse({ status: 'ok', step: 11 }),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          question: 'Question',
          answer: 'Answer',
          model: 'test-model',
          timings: {},
          retrievedChunks: [],
        }),
      );

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/Backend online/i);

    await user.type(
      screen.getByLabelText(/^Question$/i),
      'Question',
    );

    await user.click(
      screen.getByRole('button', { name: /Ask RAG/i }),
    );

    await screen.findByText('Answer');

    await user.click(
      screen.getByRole('button', { name: /Clear history/i }),
    );

    expect(
      screen.getByText(/No questions yet/i),
    ).toBeInTheDocument();
  });
});

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { chatAgent } from '../api/hireflow';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

type ParsedTable = {
  beforeText: string;
  headers: string[];
  rows: string[][];
  afterText: string;
};

function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim().startsWith('|'));
  if (start < 0 || start + 2 >= lines.length) {
    return null;
  }

  const divider = lines[start + 1].trim();
  if (!divider.startsWith('|') || !divider.includes('---')) {
    return null;
  }

  let end = start + 2;
  while (end < lines.length && lines[end].trim().startsWith('|')) {
    end += 1;
  }

  const headerLine = lines[start].trim();
  const rowLines = lines.slice(start + 2, end);
  const headers = headerLine.split('|').map((item) => item.trim()).filter(Boolean);
  const rows = rowLines
    .map((line) => line.split('|').map((item) => item.trim()).filter(Boolean))
    .filter((row) => row.length > 0);

  if (!headers.length || !rows.length) {
    return null;
  }

  return {
    beforeText: lines.slice(0, start).join('\n').trim(),
    headers,
    rows,
    afterText: lines.slice(end).join('\n').trim(),
  };
}

function renderAssistantContent(text: string) {
  const parsed = parseMarkdownTable(text);
  if (!parsed) {
    return <div className="chat-message-content">{text}</div>;
  }

  return (
    <div className="chat-message-content chat-rich-content">
      {parsed.beforeText ? <p>{parsed.beforeText}</p> : null}
      <div className="chat-table-wrap">
        <table className="chat-table">
          <thead>
            <tr>
              {parsed.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row.join('-')}`}>
                {parsed.headers.map((_, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`}>{row[colIndex] ?? '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {parsed.afterText ? <p>{parsed.afterText}</p> : null}
    </div>
  );
}

export function ChatPage() {
  const navigate = useNavigate();
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState('');
  const welcomeMessage = 'Hi, I\'m HireFlow Copilot. I can help you find candidates, explain match gaps, and answer questions about your talent pool. What would you like to know?';
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: welcomeMessage }]);

  const quickPrompts = [
    'Show top 5 candidates for current openings',
    'Which candidates are strong for frontend roles?',
    'What are the biggest skill gaps in our pipeline?',
    'Summarize interview readiness across candidates',
  ];

  const mutation = useMutation({
    mutationFn: async (message: string) => chatAgent(message),
    onSuccess: (response) => {
      setMessages((prev) => [...prev, { role: 'assistant', text: response.answer }]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'LLM is out of reach. Please check API key, billing, or try again later.';
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${message}` }]);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt) {
      return;
    }
    sendPrompt(prompt);
  };

  const sendPrompt = (prompt: string) => {
    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setInput('');
    mutation.mutate(prompt);
  };

  const clearConversation = () => {
    setMessages([{ role: 'assistant', text: welcomeMessage }]);
    setInput('');
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [navigate]);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, mutation.isPending]);

  return (
    <div className="chat-page">
      <div className="chat-container">
        <header className="chat-header">
          <div>
            <h1>HireFlow Copilot</h1>
            <p>Ask about candidates, jobs, and match gaps.</p>
          </div>
          <div className="chat-header-actions">
            <button
              type="button"
              className="chat-secondary-btn"
              onClick={clearConversation}
              disabled={mutation.isPending}
            >
              Clear
            </button>
            <button
              type="button"
              className="chat-close-btn"
              onClick={() => navigate('/')}
              aria-label="Close copilot chat"
              title="Close (Esc)"
            >
              Close
            </button>
          </div>
        </header>
        <div className="chat-quick-prompts">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chat-prompt-chip"
              onClick={() => sendPrompt(prompt)}
              disabled={mutation.isPending}
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="chat-messages" ref={messageListRef}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
              <div className="chat-message-content-wrap">
                <div className="chat-message-label">{message.role === 'assistant' ? 'Copilot' : 'You'}</div>
                {message.role === 'assistant' ? renderAssistantContent(message.text) : <div className="chat-message-content">{message.text}</div>}
              </div>
            </div>
          ))}
          {mutation.isPending ? (
            <div className="chat-message assistant loading">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : null}
        </div>

        <form className="chat-input-area" onSubmit={submit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            placeholder="Ask me anything about your candidates, jobs, or talent pool..."
            aria-label="Chat input"
            disabled={mutation.isPending}
          />
          <div className="chat-actions">
            <button type="submit" className="primary-btn" disabled={mutation.isPending || !input.trim()}>
              {mutation.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

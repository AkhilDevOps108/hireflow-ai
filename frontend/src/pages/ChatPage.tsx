import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatAgent } from '../api/hireflow';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hi, I\'m HireFlow Copilot. I can help you find candidates, explain match gaps, and answer questions about your talent pool. What would you like to know?',
    },
  ]);

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
    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setInput('');
    mutation.mutate(prompt);
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
              <div className="chat-message-content">{message.text}</div>
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

import { FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { chatAgent } from '../../api/hireflow';

type CopilotMessage = {
  role: 'user' | 'assistant';
  text: string;
  tool?: string;
};

function getContext(pathname: string): string {
  if (pathname.startsWith('/jobs/')) {
    return 'Current context: Job workflow';
  }
  if (pathname.startsWith('/candidates/')) {
    return 'Current context: Candidate profile';
  }
  if (pathname.startsWith('/interviews')) {
    return 'Current context: Interview workflow';
  }
  if (pathname.startsWith('/evaluations')) {
    return 'Current context: Evaluation workflow';
  }
  return 'Current context: Overview';
}

export function AICopilot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CopilotMessage[]>([]);

  const context = useMemo(() => getContext(location.pathname), [location.pathname]);

  const mutation = useMutation({
    mutationFn: async (message: string) => chatAgent(message),
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: response.answer, tool: response.tool },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'I could not complete that request right now. Please retry.' },
      ]);
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
    <div className={`copilot-root ${open ? 'open' : ''}`} aria-live="polite">
      <button
        type="button"
        className="bee-launcher"
        aria-label="Toggle HireFlow Copilot"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="bee-wing left" />
        <span className="bee-wing right" />
        <span className="bee-core">
          <span className="bee-eye left" />
          <span className="bee-eye right" />
        </span>
      </button>

      <aside className={`copilot-panel ${open ? 'open' : ''}`}>
        <div className="copilot-header">
          <div>
            <h3>HireFlow Copilot</h3>
            <p><span className="dot-ready" /> Ready</p>
          </div>
          <button type="button" className="ghost-btn" onClick={() => setOpen(false)} aria-label="Close copilot">Close</button>
        </div>

        <div className="copilot-context">{context}</div>

        <div className="copilot-context">
          Hi, I am HireFlow Copilot. I can find top candidates, explain match gaps, and generate interview prompts from your workflow context.
        </div>

        <div className="copilot-suggestions">
          {['Show top candidates', 'Find candidates missing Terraform', 'Compare top candidates', 'Generate interview questions'].map((suggestion) => (
            <button key={suggestion} type="button" className="pill-btn" onClick={() => setInput(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>

        <div className="copilot-messages">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`copilot-message ${message.role}`}>
              <p>{message.text}</p>
              {message.tool ? <small>Tool: {message.tool}</small> : null}
            </div>
          ))}
          {mutation.isPending ? (
            <div className="tool-steps">
              <div>Searching candidate pool... ✓</div>
              <div>Checking job requirements... ✓</div>
              <div>Retrieving evidence... ✓</div>
              <div>Calculating matches... ✓</div>
            </div>
          ) : null}
        </div>

        <form className="copilot-input" onSubmit={submit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Ask HireFlow..."
            aria-label="Copilot prompt input"
          />
          <div className="copilot-input-actions">
            <button type="button" className="ghost-btn" onClick={() => navigate('/jobs')}>Go to Jobs</button>
            <button type="submit" className="primary-btn" disabled={mutation.isPending}>Send</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

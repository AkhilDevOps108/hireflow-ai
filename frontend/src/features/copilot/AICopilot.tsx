import { useNavigate } from 'react-router-dom';

export function AICopilot() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="copilot-chat-button"
      onClick={() => navigate('/chat')}
      aria-label="Open HireFlow Copilot Chat"
      title="Open Chat"
    >
      <span className="bee-core">
        <span className="bee-eye left" />
        <span className="bee-eye right" />
      </span>
    </button>
  );
}

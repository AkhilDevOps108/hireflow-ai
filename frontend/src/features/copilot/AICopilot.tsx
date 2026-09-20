import { useLocation, useNavigate } from 'react-router-dom';

export function AICopilot() {
  const location = useLocation();
  const navigate = useNavigate();

  // The launcher is hidden on the chat page to avoid duplicate controls.
  if (location.pathname === '/chat') {
    return null;
  }

  return (
    <div className="copilot-root">
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
    </div>
  );
}

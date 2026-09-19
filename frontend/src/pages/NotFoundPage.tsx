import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="state-panel error">
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
      <Link className="primary-btn" to="/">Back to Overview</Link>
    </div>
  );
}

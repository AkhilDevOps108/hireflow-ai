import { useParams } from 'react-router-dom';

export function InterviewDetailPage() {
  const { id } = useParams();

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Interview Detail</h1>
          <p>Interview ID: {id}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Generated Questions</h2></div>
        <ul className="simple-list">
          <li><strong>Technical</strong><small>Describe how you handled EKS upgrades while keeping workloads available.</small></li>
          <li><strong>Architecture</strong><small>Explain your cloud reliability architecture for production ML systems.</small></li>
          <li><strong>Follow-up</strong><small>What trade-offs did you make while scaling Kubernetes clusters?</small></li>
        </ul>
      </section>
    </div>
  );
}

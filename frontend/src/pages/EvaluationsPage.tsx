import { useQuery } from '@tanstack/react-query';
import { getEvaluations } from '../api/hireflow';

export function EvaluationsPage() {
  const evaluationsQuery = useQuery({ queryKey: ['evaluations'], queryFn: getEvaluations });

  if (evaluationsQuery.isLoading) {
    return <div className="state-panel">Loading evaluations...</div>;
  }

  if (evaluationsQuery.isError) {
    return <div className="state-panel error">Unable to load evaluations.</div>;
  }

  const evaluations = evaluationsQuery.data ?? [];

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Evaluations</h1>
          <p>Review interview evidence and requirement validation status.</p>
        </div>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Interview</th>
                <th>Requirements</th>
                <th>Evidence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id}>
                  <td>{evaluation.candidate_id}</td>
                  <td>{evaluation.job_id}</td>
                  <td>Structured Assessment</td>
                  <td>{evaluation.requirements_validated.length} validated / {evaluation.requirements_unvalidated.length} unanswered</td>
                  <td>{evaluation.summary}</td>
                  <td>{evaluation.status}</td>
                  <td><button type="button" className="link-like">Open</button></td>
                </tr>
              ))}
              {evaluations.length === 0 ? <tr><td colSpan={7} className="empty-cell">No evaluations yet. Analyze interview notes to generate reports.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

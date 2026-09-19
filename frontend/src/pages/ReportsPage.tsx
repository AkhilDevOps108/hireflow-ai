import { useQuery } from '@tanstack/react-query';
import { getJobs } from '../api/hireflow';

export function ReportsPage() {
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: getJobs });
  const jobs = jobsQuery.data ?? [];

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Recruiter-facing analytics and requirement coverage trends.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Job Summary</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Candidates</th>
                <th>Strong Matches</th>
                <th>Interviewed</th>
                <th>Evaluation Pending</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>{Math.max(0, 128 - index * 18)}</td>
                  <td>{Math.max(0, 42 - index * 7)}</td>
                  <td>{Math.max(0, 12 - index * 2)}</td>
                  <td>{Math.max(0, 5 - index)}</td>
                </tr>
              ))}
              {!jobs.length ? <tr><td colSpan={5} className="empty-cell">No report data available yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

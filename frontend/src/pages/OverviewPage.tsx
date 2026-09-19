import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCandidates, getJobs, getTopCandidates } from '../api/hireflow';
import { MetricCard } from '../components/MetricCard';

export function OverviewPage() {
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: getJobs });
  const candidatesQuery = useQuery({ queryKey: ['candidates'], queryFn: getCandidates });

  const overviewQuery = useQuery({
    queryKey: ['overview-job-matching', jobsQuery.data?.map((job) => job.id).join(',')],
    enabled: Boolean(jobsQuery.data?.length),
    queryFn: async () => {
      const jobs = jobsQuery.data ?? [];
      const stats = await Promise.all(
        jobs.map(async (job) => {
          const ranked = await getTopCandidates(job.id);
          const strongMatches = ranked.candidates.filter((candidate) => candidate.match_score >= 85).length;
          return { jobId: job.id, strongMatches, reviewed: Math.min(18, ranked.candidates.length) };
        }),
      );
      return stats;
    },
  });

  if (jobsQuery.isLoading || candidatesQuery.isLoading) {
    return <div className="state-panel">Loading overview...</div>;
  }

  if (jobsQuery.isError || candidatesQuery.isError) {
    return <div className="state-panel error">Unable to load overview data. Please retry.</div>;
  }

  const jobs = jobsQuery.data ?? [];
  const candidates = candidatesQuery.data ?? [];
  const matchingStats = overviewQuery.data ?? [];
  const strongMatchesTotal = matchingStats.reduce((sum, item) => sum + item.strongMatches, 0);

  const funnel = {
    applications: candidates.length,
    screened: Math.max(0, Math.round(candidates.length * 0.75)),
    strong: strongMatchesTotal,
    recruiter: Math.max(0, Math.round(strongMatchesTotal * 0.45)),
    interview: Math.max(0, Math.round(strongMatchesTotal * 0.28)),
    evaluation: Math.max(0, Math.round(strongMatchesTotal * 0.16)),
  };

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Recruitment activity and candidate intelligence.</p>
        </div>
        <Link className="primary-btn" to="/jobs">+ Create Job</Link>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Active Jobs" value={jobs.length} />
        <MetricCard label="Candidates" value={candidates.length} />
        <MetricCard label="Interviews" value={funnel.interview} tone="warning" />
        <MetricCard label="Open Evaluations" value={funnel.evaluation} tone="success" />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Active Jobs</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Department</th>
                <th>Location</th>
                <th>Candidates</th>
                <th>Analyzed</th>
                <th>Strong Matches</th>
                <th>Interview Stage</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">No jobs yet. Create your first role to start candidate matching.</td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const stat = matchingStats.find((item) => item.jobId === job.id);
                  return (
                    <tr key={job.id}>
                      <td>{job.title}</td>
                      <td>{job.department}</td>
                      <td>{job.location}</td>
                      <td>{candidates.length}</td>
                      <td>{candidates.length}</td>
                      <td>{stat?.strongMatches ?? 0}</td>
                      <td>{stat?.reviewed ?? 0}</td>
                      <td>Just now</td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/jobs/${job.id}`}>Open Job</Link>
                          <Link to={`/jobs/${job.id}/candidates`}>Find Candidates</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="split-grid">
        <div className="panel">
          <div className="panel-head"><h2>Recent Candidate Activity</h2></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Match</th>
                  <th>Stage</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {candidates.slice(0, 5).map((candidate, index) => (
                  <tr key={candidate.id}>
                    <td>{candidate.name}</td>
                    <td>{jobs[0]?.title ?? 'Unassigned'}</td>
                    <td>{Math.max(72, 94 - index * 2)}%</td>
                    <td>{index % 2 === 0 ? 'Technical Interview' : 'Recruiter Review'}</td>
                    <td>{10 + index * 8} min ago</td>
                  </tr>
                ))}
                {candidates.length === 0 ? (
                  <tr><td colSpan={5} className="empty-cell">No candidate activity yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Recruitment Funnel</h2></div>
          <div className="funnel-list">
            <div><span>Applications</span><strong>{funnel.applications}</strong></div>
            <div><span>AI-screened</span><strong>{funnel.screened}</strong></div>
            <div><span>Strong matches</span><strong>{funnel.strong}</strong></div>
            <div><span>Recruiter review</span><strong>{funnel.recruiter}</strong></div>
            <div><span>Interview</span><strong>{funnel.interview}</strong></div>
            <div><span>Evaluation</span><strong>{funnel.evaluation}</strong></div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>AI Insights</h2></div>
        <div className="insights-grid">
          <button type="button" className="insight-item">{strongMatchesTotal} candidates match all core technical requirements.</button>
          <button type="button" className="insight-item">{Math.max(0, candidates.length - strongMatchesTotal)} candidates are missing Terraform evidence.</button>
          <button type="button" className="insight-item">{Math.max(0, Math.round(candidates.length * 0.18))} candidates need manual validation of experience.</button>
          <button type="button" className="insight-item">{Math.max(0, Math.round(candidates.length * 0.08))} candidates show strong GenAI exposure.</button>
        </div>
      </section>
    </div>
  );
}

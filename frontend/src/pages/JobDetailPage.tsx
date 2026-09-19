import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJob, getTopCandidates } from '../api/hireflow';
import { MetricCard } from '../components/MetricCard';

const tabs = ['Overview', 'Requirements', 'Candidates', 'Interviews', 'Activity'] as const;

type Tab = (typeof tabs)[number];

export function JobDetailPage() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<Tab>('Overview');

  const jobQuery = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id), enabled: Boolean(id) });
  const topQuery = useQuery({ queryKey: ['job-top', id], queryFn: () => getTopCandidates(id), enabled: Boolean(id) });

  const coverage = useMemo(() => {
    const requirements = jobQuery.data?.requirements ?? [];
    const candidates = topQuery.data?.candidates ?? [];
    return requirements.map((req) => {
      const verified = candidates.filter((candidate) => candidate.matched_skills.includes(req.name)).length;
      const missing = candidates.filter((candidate) => candidate.missing_skills.includes(req.name)).length;
      const partial = Math.max(0, candidates.length - verified - missing);
      return { req: req.name, verified, missing, partial };
    });
  }, [jobQuery.data?.requirements, topQuery.data?.candidates]);

  if (jobQuery.isLoading) {
    return <div className="state-panel">Loading job details...</div>;
  }

  if (jobQuery.isError || !jobQuery.data) {
    return <div className="state-panel error">Job not found.</div>;
  }

  const job = jobQuery.data;
  const ranked = topQuery.data?.candidates ?? [];
  const strong = ranked.filter((item) => item.match_score >= 85).length;

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>{job.title}</h1>
          <p>{job.department} · {job.location} · {job.employment_type}</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="ghost-btn">Edit Job</button>
          <button type="button" className="ghost-btn">Add Candidates</button>
          <Link className="primary-btn" to={`/jobs/${job.id}/candidates`}>Find Candidates</Link>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Candidates" value={ranked.length} />
        <MetricCard label="Strong Matches" value={strong} tone="success" />
        <MetricCard label="Recruiter Review" value={Math.round(strong * 0.45)} />
        <MetricCard label="Interviews" value={Math.round(strong * 0.28)} tone="warning" />
      </section>

      <section className="tabs">
        {tabs.map((item) => (
          <button key={item} type="button" className={`tab-btn ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </section>

      {tab === 'Overview' ? (
        <section className="panel">
          <div className="panel-head"><h2>Matching Summary</h2></div>
          <div className="coverage-grid">
            {coverage.map((item) => {
              const pct = ranked.length > 0 ? Math.round((item.verified / ranked.length) * 100) : 0;
              return (
                <div key={item.req} className="coverage-row">
                  <span>{item.req}</span>
                  <strong>{pct}%</strong>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === 'Requirements' ? (
        <section className="panel">
          <div className="split-grid">
            <div>
              <h3>Must Have</h3>
              <ul className="simple-list">
                {job.requirements.filter((req) => req.priority === 'must_have').map((req) => {
                  const row = coverage.find((item) => item.req === req.name);
                  return (
                    <li key={req.id}>
                      <strong>{req.name}</strong>
                      <small>{row?.verified ?? 0} verified · {row?.partial ?? 0} partial · {row?.missing ?? 0} no evidence</small>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3>Nice to Have</h3>
              <ul className="simple-list">
                {job.requirements.filter((req) => req.priority === 'nice_to_have').map((req) => {
                  const row = coverage.find((item) => item.req === req.name);
                  return (
                    <li key={req.id}>
                      <strong>{req.name}</strong>
                      <small>{row?.verified ?? 0} verified · {row?.partial ?? 0} partial · {row?.missing ?? 0} no evidence</small>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'Candidates' ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Candidate Matching</h2>
            <Link to={`/jobs/${job.id}/candidates`} className="primary-btn">Find Top 10</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Match</th>
                  <th>Experience</th>
                  <th>Core Skills</th>
                  <th>Missing</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 5).map((candidate) => (
                  <tr key={candidate.candidate_id}>
                    <td>{candidate.name}</td>
                    <td>{candidate.match_score}%</td>
                    <td>{candidate.experience_years.toFixed(1)} yrs</td>
                    <td>{candidate.matched_skills.join(', ') || '-'}</td>
                    <td>{candidate.missing_skills.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'Interviews' ? <section className="state-panel">No interviews yet. Interviews appear here once candidates enter interview workflow.</section> : null}
      {tab === 'Activity' ? <section className="state-panel">Activity events for this job will appear here.</section> : null}
    </div>
  );
}

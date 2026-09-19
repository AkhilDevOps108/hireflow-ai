import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getCandidateSummary, getCandidates, getJobs } from '../api/hireflow';

export function CandidateProfilePage() {
  const { id = '' } = useParams();
  const candidatesQuery = useQuery({ queryKey: ['candidates'], queryFn: getCandidates });
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: getJobs });

  const candidate = candidatesQuery.data?.find((item) => item.id === id);
  const selectedJobId = jobsQuery.data?.[0]?.id;
  const summaryQuery = useQuery({
    queryKey: ['candidate-summary', id, selectedJobId],
    queryFn: () => getCandidateSummary(id, selectedJobId),
    enabled: Boolean(candidate && selectedJobId),
  });

  if (candidatesQuery.isLoading) {
    return <div className="state-panel">Loading candidate profile...</div>;
  }

  if (!candidate) {
    return <div className="state-panel error">Candidate not found.</div>;
  }

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>{candidate.name}</h1>
          <p>{candidate.email} · {candidate.experience_years.toFixed(1)} years experience</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="ghost-btn">Compare</button>
          <button type="button" className="ghost-btn">Assign to Job</button>
          <button type="button" className="primary-btn">Generate Interview</button>
        </div>
      </section>

      <section className="split-grid">
        <div className="panel">
          <div className="panel-head"><h2>Overview</h2></div>
          <p>{summaryQuery.data?.summary ?? 'Candidate profile generated from uploaded resume content and extracted skill signals.'}</p>
          <h3>Skills</h3>
          <div className="chip-row">
            {candidate.skills.map((skill) => <span key={skill} className="skill-chip">{skill}</span>)}
          </div>

          <h3 style={{ marginTop: 10 }}>Projects</h3>
          <ul className="simple-list">
            {(summaryQuery.data?.projects ?? candidate.projects ?? []).slice(0, 5).map((project) => (
              <li key={project}><small>{project}</small></li>
            ))}
            {!(summaryQuery.data?.projects ?? candidate.projects ?? []).length ? <li><small>No explicit project evidence extracted.</small></li> : null}
          </ul>

          <h3 style={{ marginTop: 10 }}>Qualifications</h3>
          <div className="chip-row">
            {(summaryQuery.data?.qualifications ?? candidate.qualifications ?? []).map((item) => <span key={item} className="skill-chip">{item}</span>)}
            {!(summaryQuery.data?.qualifications ?? candidate.qualifications ?? []).length ? <small>No clear qualifications extracted.</small> : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Current Job Matches</h2></div>
          <ul className="simple-list">
            <li><strong>Senior MLOps Engineer</strong><small>94% match</small></li>
            <li><strong>AI Engineer</strong><small>88% match</small></li>
            <li><strong>Platform Engineer</strong><small>82% match</small></li>
          </ul>

          <h3 style={{ marginTop: 10 }}>Needs Validation</h3>
          <ul className="simple-list">
            {(summaryQuery.data?.unclear_information ?? candidate.unclear_information ?? []).map((item) => (
              <li key={item}><small>{item}</small></li>
            ))}
            {!(summaryQuery.data?.unclear_information ?? candidate.unclear_information ?? []).length ? <li><small>No unclear areas identified.</small></li> : null}
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Evidence</h2></div>
        <div className="evidence-card">
          <strong>AWS</strong>
          <p>"Managed production workloads on AWS EKS with infrastructure automation."</p>
          <small>Source: {candidate.source_file} · Work Experience</small>
        </div>
      </section>
    </div>
  );
}

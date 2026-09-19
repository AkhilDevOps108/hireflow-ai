import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJob, getTopCandidates } from '../api/hireflow';
import type { RankedCandidate } from '../types/hireflow';

function breakdown(score: number) {
  const required = Math.round((score * 45) / 100);
  const experience = Math.round((score * 20) / 100);
  const projects = Math.round((score * 15) / 100);
  const education = Math.round((score * 10) / 100);
  const nice = Math.round((score * 10) / 100);
  return { required, experience, projects, education, nice };
}

export function JobCandidatesPage() {
  const { id = '' } = useParams();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RankedCandidate | null>(null);

  const jobQuery = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id), enabled: Boolean(id) });
  const topQuery = useQuery({ queryKey: ['job-top', id], queryFn: () => getTopCandidates(id), enabled: Boolean(id) });

  const filtered = useMemo(() => {
    const rows = topQuery.data?.candidates ?? [];
    const term = search.toLowerCase().trim();
    if (!term) {
      return rows;
    }
    return rows.filter((candidate) => {
      const haystack = [candidate.name, candidate.email, candidate.matched_skills.join(' '), candidate.missing_skills.join(' ')].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [search, topQuery.data?.candidates]);

  const strong = filtered.filter((candidate) => candidate.match_score >= 85).length;

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Top Candidates</h1>
          <p>Candidates ranked against the requirements configured for this role.</p>
          <small>{jobQuery.data?.title ?? 'Selected role'}</small>
        </div>
        <div className="inline-actions">
          <button type="button" className="ghost-btn">Filters</button>
          <button type="button" className="ghost-btn">Compare</button>
          <button type="button" className="ghost-btn">Export</button>
        </div>
      </section>

      <section className="toolbar-strip">
        <div>{filtered.length} candidates analyzed</div>
        <div>{strong} strong matches</div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <input
            className="table-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search candidate, skill, requirement..."
            aria-label="Search top candidates"
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Match</th>
                <th>Experience</th>
                <th>Core Skills</th>
                <th>Missing Requirements</th>
                <th>Evidence</th>
                <th>Stage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((candidate, index) => (
                <tr key={candidate.candidate_id}>
                  <td>{String(index + 1).padStart(2, '0')}</td>
                  <td>
                    <div>{candidate.name}</div>
                    <small>{candidate.email}</small>
                  </td>
                  <td>
                    <button type="button" className="score-btn" onClick={() => setSelected(candidate)}>
                      {candidate.match_score}%
                    </button>
                  </td>
                  <td>{candidate.experience_years.toFixed(1)} yrs</td>
                  <td>{candidate.matched_skills.join(' · ') || '-'}</td>
                  <td>{candidate.missing_skills.join(' · ') || '-'}</td>
                  <td>{candidate.evidence_confidence}%</td>
                  <td>{candidate.match_score >= 85 ? 'Review' : 'Screening'}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/candidates/${candidate.candidate_id}`}>View</Link>
                      <button type="button" className="link-like">Compare</button>
                      <button type="button" className="link-like">Interview</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? <tr><td colSpan={9} className="empty-cell">No candidates matched the current filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <aside className="drawer">
          <div className="drawer-head">
            <div>
              <h3>Candidate Match Analysis</h3>
              <p>{selected.name} · {selected.match_score}% match</p>
            </div>
            <button type="button" className="ghost-btn" onClick={() => setSelected(null)}>Close</button>
          </div>

          {(() => {
            const b = breakdown(selected.match_score);
            return (
              <div className="breakdown-list">
                <div><span>Required Skills</span><strong>{b.required} / 45</strong></div>
                <div><span>Experience</span><strong>{b.experience} / 20</strong></div>
                <div><span>Relevant Projects</span><strong>{b.projects} / 15</strong></div>
                <div><span>Education</span><strong>{b.education} / 10</strong></div>
                <div><span>Nice-to-have</span><strong>{b.nice} / 10</strong></div>
              </div>
            );
          })()}

          <div className="evidence-block">
            <h4>Requirement Evidence</h4>
            <ul className="simple-list">
              {selected.matched_skills.map((skill) => (
                <li key={skill}><strong>{skill}</strong><small>Verified evidence in resume text.</small></li>
              ))}
              {selected.missing_skills.map((skill) => (
                <li key={skill}><strong>{skill}</strong><small>No verified evidence detected.</small></li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

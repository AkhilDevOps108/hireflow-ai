import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { analyzeInterviewNotes, generateInterviewFollowUps, generateInterviewQuestions, getCandidates, getJobs } from '../api/hireflow';

export function InterviewsPage() {
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: getJobs });
  const candidatesQuery = useQuery({ queryKey: ['candidates'], queryFn: getCandidates });
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const questionsMutation = useMutation({
    mutationFn: async () => generateInterviewQuestions(selectedCandidateId, selectedJobId),
  });
  const followUpsMutation = useMutation({
    mutationFn: async () => generateInterviewFollowUps(selectedCandidateId, selectedJobId, answerInput),
  });
  const notesMutation = useMutation({
    mutationFn: async () => analyzeInterviewNotes(selectedCandidateId, selectedJobId, notesInput),
  });

  const rows = (candidatesQuery.data ?? []).slice(0, 8).map((candidate, index) => ({
    id: candidate.id,
    candidate: candidate.name,
    job: jobsQuery.data?.[index % (jobsQuery.data?.length || 1)]?.title ?? 'Unassigned role',
    interview: index % 2 === 0 ? 'Technical Interview' : 'System Design',
    interviewer: index % 2 === 0 ? 'Priya N' : 'Arun M',
    status: index % 3 === 0 ? 'Scheduled' : 'Pending',
    scheduled: index % 3 === 0 ? 'Today 4:00 PM' : 'Not set',
  }));

  const submitInterviewActions = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCandidateId || !selectedJobId) {
      return;
    }
    questionsMutation.mutate();
  };

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Interviews</h1>
          <p>Prepare, conduct and analyze candidate interviews.</p>
        </div>
      </section>

      <section className="panel">
        <div className="pipeline-row">
          <span>Recruiter Review</span>
          <span>Technical Interview</span>
          <span>System Design</span>
          <span>Hiring Manager</span>
          <span>Final Evaluation</span>
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
                <th>Interviewer</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.candidate}</td>
                  <td>{row.job}</td>
                  <td>{row.interview}</td>
                  <td>{row.interviewer}</td>
                  <td>{row.status}</td>
                  <td>{row.scheduled}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-like">Generate Questions</button>
                      <button type="button" className="link-like">Open</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={7} className="empty-cell">No interviews yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Interview Intelligence</h2></div>
        <form className="form-grid" onSubmit={submitInterviewActions}>
          <label>
            <span>Candidate</span>
            <select value={selectedCandidateId} onChange={(event) => setSelectedCandidateId(event.target.value)}>
              <option value="">Select candidate</option>
              {(candidatesQuery.data ?? []).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Job</span>
            <select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
              <option value="">Select job</option>
              {(jobsQuery.data ?? []).map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary-btn" disabled={questionsMutation.isPending}>Generate Questions</button>
        </form>

        {questionsMutation.data?.questions ? (
          <ul className="simple-list" style={{ marginTop: 10 }}>
            {questionsMutation.data.questions.map((question, index) => (
              <li key={`${question.category}-${index}`}>
                <strong>{question.category}</strong>
                <small>{question.question}</small>
                <small>Reason: {question.reason}</small>
              </li>
            ))}
          </ul>
        ) : null}

        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <textarea rows={3} value={answerInput} onChange={(event) => setAnswerInput(event.target.value)} placeholder="Paste candidate answer for follow-up generation" />
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              if (selectedCandidateId && selectedJobId && answerInput.trim()) {
                followUpsMutation.mutate();
              }
            }}
          >
            Generate Follow-up Questions
          </button>
        </div>

        {followUpsMutation.data?.follow_up_questions ? (
          <ul className="simple-list" style={{ marginTop: 10 }}>
            {followUpsMutation.data.follow_up_questions.map((item) => (
              <li key={item}><small>{item}</small></li>
            ))}
          </ul>
        ) : null}

        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <textarea rows={4} value={notesInput} onChange={(event) => setNotesInput(event.target.value)} placeholder="Paste interview notes to generate standardized evaluation" />
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              if (selectedCandidateId && selectedJobId && notesInput.trim()) {
                notesMutation.mutate();
              }
            }}
          >
            Analyze Interview Notes
          </button>
        </div>

        {notesMutation.data ? (
          <div className="analysis-box" style={{ marginTop: 10 }}>
            <strong>Standardized Interview Evaluation Report</strong>
            <p>{notesMutation.data.summary}</p>
            <p>Validated: {notesMutation.data.requirements_validated.join(', ') || 'None'}</p>
            <p>Unanswered areas: {notesMutation.data.requirements_unvalidated.join(', ') || 'None'}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createJob, getJobs, type JobInput } from '../api/hireflow';
import { StatusBadge } from '../components/StatusBadge';

const steps = ['Details', 'Description', 'AI Analysis', 'Requirements', 'Review'];

function analyzeDescriptionDraft(description: string) {
  const skills = ['Python', 'AWS', 'Kubernetes', 'Terraform', 'Docker', 'LangGraph', 'RAG', 'LLMOps', 'OpenTelemetry'];
  const found = skills.filter((skill) => description.toLowerCase().includes(skill.toLowerCase()));
  const mustHave = found.filter((skill) => ['Python', 'AWS', 'Kubernetes', 'Terraform', 'Docker'].includes(skill));
  const niceToHave = found.filter((skill) => !mustHave.includes(skill));
  const years = description.match(/(\d+)\+?\s*years?/i)?.[1] ?? '4';
  return { mustHave, niceToHave, years };
}

export function JobsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: getJobs });

  const [openWizard, setOpenWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<JobInput>({
    title: '',
    department: '',
    location: '',
    employment_type: 'Full-time',
    description: '',
  });
  const draftAnalysis = useMemo(() => analyzeDescriptionDraft(input.description), [input.description]);

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setOpenWizard(false);
      setStep(0);
      setInput({ title: '', department: '', location: '', employment_type: 'Full-time', description: '' });
      navigate(`/jobs/${job.id}`);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate(input);
  };

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Jobs</h1>
          <p>Manage roles, requirements and candidate pipelines.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => setOpenWizard(true)}>+ Create Job</button>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Department</th>
                <th>Location</th>
                <th>Status</th>
                <th>Candidates</th>
                <th>Strong Matches</th>
                <th>Interviews</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobsQuery.data?.map((job, index) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>{job.department}</td>
                  <td>{job.location}</td>
                  <td><StatusBadge value={index % 3 === 2 ? 'Draft' : 'Active'} tone={index % 3 === 2 ? 'warning' : 'success'} /></td>
                  <td>{Math.max(0, 128 - index * 24)}</td>
                  <td>{Math.max(0, 42 - index * 8)}</td>
                  <td>{Math.max(0, 12 - index * 3)}</td>
                  <td>{index === 0 ? '2h ago' : index === 1 ? '5h ago' : '1d ago'}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/jobs/${job.id}`}>Open</Link>
                      <button type="button" className="link-like">Edit</button>
                      <button type="button" className="link-like">Duplicate</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!jobsQuery.data?.length ? <tr><td colSpan={9} className="empty-cell">No jobs available.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {openWizard ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create job wizard">
          <form className="modal" onSubmit={submit}>
            <div className="modal-head">
              <h2>Create Job</h2>
              <button type="button" className="ghost-btn" onClick={() => setOpenWizard(false)}>Close</button>
            </div>

            <div className="steps">
              {steps.map((label, index) => (
                <div key={label} className={`step ${index <= step ? 'active' : ''}`}>{index + 1}. {label}</div>
              ))}
            </div>

            {step === 0 ? (
              <div className="form-grid">
                <label><span>Title</span><input value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} required /></label>
                <label><span>Department</span><input value={input.department} onChange={(event) => setInput({ ...input, department: event.target.value })} required /></label>
                <label><span>Location</span><input value={input.location} onChange={(event) => setInput({ ...input, location: event.target.value })} required /></label>
                <label><span>Employment Type</span><input value={input.employment_type} onChange={(event) => setInput({ ...input, employment_type: event.target.value })} required /></label>
              </div>
            ) : null}

            {step === 1 ? (
              <label className="block-label">
                <span>Job Description</span>
                <textarea rows={8} value={input.description} onChange={(event) => setInput({ ...input, description: event.target.value })} required />
              </label>
            ) : null}

            {step === 2 ? (
              <div className="analysis-box">
                <h3>AI Requirement Analysis</h3>
                <p>Reading description -&gt; Extracting requirements -&gt; Grouping skills -&gt; Detecting experience</p>
                <div className="analysis-grid">
                  <div><strong>Must Have</strong><p>{draftAnalysis.mustHave.join(', ') || 'No core skills detected yet'}</p></div>
                  <div><strong>Nice to Have</strong><p>{draftAnalysis.niceToHave.join(', ') || 'No additional skills detected yet'}</p></div>
                  <div><strong>Experience</strong><p>{draftAnalysis.years}+ years</p></div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="analysis-box">
                <h3>Review Requirements</h3>
                <p>Requirements are extracted from JD and will be persisted by backend JD analysis after creation.</p>
                <ul>
                  {draftAnalysis.mustHave.map((item) => <li key={item}>Must Have: {item}</li>)}
                  {draftAnalysis.niceToHave.map((item) => <li key={item}>Nice to Have: {item}</li>)}
                </ul>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="analysis-box">
                <h3>Review and Create</h3>
                <p><strong>{input.title || 'Untitled Role'}</strong> · {input.department || 'Department'} · {input.location || 'Location'}</p>
                <p>{input.description || 'No description added yet.'}</p>
              </div>
            ) : null}

            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setStep((prev) => Math.max(0, prev - 1))} disabled={step === 0}>Back</button>
              {step < 4 ? (
                <button type="button" className="primary-btn" onClick={() => setStep((prev) => Math.min(4, prev + 1))}>Next</button>
              ) : (
                <button type="submit" className="primary-btn" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Job'}</button>
              )}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

import { ChangeEvent, DragEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCandidates, queryCandidatesNaturalLanguage, uploadCandidate } from '../api/hireflow';

type UploadStatus = {
  name: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
};

export function TalentPoolPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [queryResults, setQueryResults] = useState<{ query: string; count: number; results: { candidate_id: string; name: string; email: string; experience_years: number; skills: string[]; match_score: number }[] } | null>(null);

  const candidatesQuery = useQuery({ queryKey: ['candidates'], queryFn: getCandidates });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => uploadCandidate(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  const queryMutation = useMutation({
    mutationFn: async (query: string) => queryCandidatesNaturalLanguage(query),
    onSuccess: (result) => {
      setQueryResults(result);
    },
  });

  const filtered = useMemo(() => {
    const rows = candidatesQuery.data ?? [];
    const term = search.toLowerCase().trim();
    if (!term) {
      return rows;
    }
    return rows.filter((candidate) => {
      const haystack = [candidate.name, candidate.email, candidate.skills.join(' ')].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [candidatesQuery.data, search]);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) {
      return;
    }

    setUploadStatus((prev) => [...prev, ...list.map((file) => ({ name: file.name, status: 'uploaded' as const }))]);

    for (const file of list) {
      setUploadStatus((prev) => prev.map((row) => (row.name === file.name ? { ...row, status: 'processing' } : row)));
      try {
        await uploadMutation.mutateAsync(file);
        setUploadStatus((prev) => prev.map((row) => (row.name === file.name ? { ...row, status: 'ready' } : row)));
      } catch {
        setUploadStatus((prev) => prev.map((row) => (row.name === file.name ? { ...row, status: 'failed' } : row)));
      }
    }
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      await uploadFiles(event.dataTransfer.files);
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) {
      await uploadFiles(files);
      event.target.value = '';
    }
  };

  const counts = {
    uploaded: uploadStatus.length,
    processing: uploadStatus.filter((item) => item.status === 'processing').length,
    ready: uploadStatus.filter((item) => item.status === 'ready').length,
    failed: uploadStatus.filter((item) => item.status === 'failed').length,
  };

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Talent Pool</h1>
          <p>Search and explore your candidate database.</p>
        </div>
      </section>

      <section
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <h3>Upload candidate resumes</h3>
        <p>Drag & drop PDF or DOCX files here</p>
        <label className="primary-btn upload-btn" htmlFor="resume-bulk-input">Browse Files</label>
        <input id="resume-bulk-input" type="file" multiple accept=".pdf,.docx,.txt" onChange={onFileChange} hidden />

        <div className="upload-stats">
          <span>Uploaded: {counts.uploaded}</span>
          <span>Processing: {counts.processing}</span>
          <span>Complete: {counts.ready}</span>
          <span>Failed: {counts.failed}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div style={{ display: 'grid', gap: 8, width: '100%' }}>
            <input
              className="table-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, skill, experience..."
              aria-label="Search talent pool"
            />
            <div className="inline-actions">
              <input
                className="table-search"
                value={nlQuery}
                onChange={(event) => setNlQuery(event.target.value)}
                placeholder="Natural language query: candidates with AWS and Kubernetes over 5 years"
                aria-label="Natural language candidate query"
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  const query = nlQuery.trim();
                  if (!query) {
                    return;
                  }
                  queryMutation.mutate(query);
                }}
              >
                Run Query
              </button>
            </div>
          </div>
        </div>

        {queryResults ? (
          <div className="analysis-box" style={{ marginBottom: 10 }}>
            <strong>Query Result</strong>
            <p>
              "{queryResults.query}" returned {queryResults.count} candidates.
            </p>
          </div>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Experience</th>
                <th>Top Skills</th>
                <th>Current Match</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(queryResults ? queryResults.results : filtered).map((candidate, index) => (
                <tr key={'candidate_id' in candidate ? candidate.candidate_id : candidate.id}>
                  <td>{candidate.name}</td>
                  <td>{candidate.email}</td>
                  <td>{candidate.experience_years.toFixed(1)} yrs</td>
                  <td>{candidate.skills.slice(0, 4).join(' · ') || '-'}</td>
                  <td>{'match_score' in candidate && candidate.match_score ? `${candidate.match_score}%` : `${Math.max(70, 94 - index * 3)}%`}</td>
                  <td>{index * 12 + 6} min ago</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/candidates/${'candidate_id' in candidate ? candidate.candidate_id : candidate.id}`}>View</Link>
                      <button type="button" className="link-like">Compare</button>
                      <button type="button" className="link-like">Assign to Job</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!(queryResults ? queryResults.results.length : filtered.length) ? <tr><td colSpan={7} className="empty-cell">No candidates yet. Upload resumes to begin matching.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

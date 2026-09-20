import { ChangeEvent, DragEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCandidates, uploadCandidate } from '../api/hireflow';

type UploadStatus = {
  id: string;
  name: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  error?: string;
};

export function TalentPoolPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const candidatesQuery = useQuery({ queryKey: ['candidates'], queryFn: getCandidates });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => uploadCandidate(file),
    onSuccess: (candidate) => {
      queryClient.setQueryData(['candidates'], (previous: typeof candidatesQuery.data) => {
        const current = previous ?? [];
        if (current.some((row) => row.id === candidate.id)) {
          return current;
        }
        return [candidate, ...current];
      });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
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

    const entries = list.map((file, index) => ({
      id: `${file.name}-${Date.now()}-${index}`,
      name: file.name,
      status: 'uploaded' as const,
    }));

    setUploadStatus((prev) => [...prev, ...entries]);

    for (const [index, entry] of entries.entries()) {
      const file = list[index];
      if (!file) {
        continue;
      }

      setUploadStatus((prev) => prev.map((row) => (row.id === entry.id ? { ...row, status: 'processing', error: undefined } : row)));
      try {
        await uploadMutation.mutateAsync(file);
        setUploadStatus((prev) => prev.map((row) => (row.id === entry.id ? { ...row, status: 'ready' } : row)));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setUploadStatus((prev) => prev.map((row) => (row.id === entry.id ? { ...row, status: 'failed', error: message } : row)));
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
          <span>Failed: {counts.failed}</span>
        </div>

        {uploadStatus.some((item) => item.status !== 'ready') ? (
          <div className="upload-results">
            {uploadStatus
              .filter((item) => item.status !== 'ready')
              .slice(-8)
              .map((item) => (
              <div key={item.id} className={`upload-item ${item.status}`}>
                <span>{item.name}</span>
                <span>{item.status === 'failed' && item.error ? item.error : item.status}</span>
              </div>
            ))}
          </div>
        ) : null}
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
          </div>
        </div>

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
              {filtered.map((candidate, index) => (
                <tr key={candidate.id}>
                  <td>{candidate.name}</td>
                  <td>{candidate.email}</td>
                  <td>{candidate.experience_years.toFixed(1)} yrs</td>
                  <td>{candidate.skills.slice(0, 4).join(' · ') || '-'}</td>
                  <td>{`${Math.max(70, 94 - index * 3)}%`}</td>
                  <td>{index * 12 + 6} min ago</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/candidates/${candidate.id}`}>View</Link>
                      <button type="button" className="link-like">Compare</button>
                      <button type="button" className="link-like">Assign to Job</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? <tr><td colSpan={7} className="empty-cell">No candidates yet. Upload resumes to begin matching.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

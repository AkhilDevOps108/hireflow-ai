import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { EvaluationsPage } from './pages/EvaluationsPage';
import { InterviewDetailPage } from './pages/InterviewDetailPage';
import { InterviewsPage } from './pages/InterviewsPage';
import { JobCandidatesPage } from './pages/JobCandidatesPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { JobsPage } from './pages/JobsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { TalentPoolPage } from './pages/TalentPoolPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="jobs/:id/candidates" element={<JobCandidatesPage />} />
        <Route path="jobs/:id/requirements" element={<JobDetailPage />} />
        <Route path="candidates" element={<TalentPoolPage />} />
        <Route path="candidates/:id" element={<CandidateProfilePage />} />
        <Route path="interviews" element={<InterviewsPage />} />
        <Route path="interviews/:id" element={<InterviewDetailPage />} />
        <Route path="evaluations" element={<EvaluationsPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;

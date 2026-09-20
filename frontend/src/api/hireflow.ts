import { apiFetch } from './client';
import type {
  AgentChatResponse,
  AuditEvent,
  Candidate,
  CandidateQueryResponse,
  CandidateSummary,
  InterviewEvaluation,
  Job,
  TopCandidatesResponse,
} from '../types/hireflow';

export type JobInput = {
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
};

export function getJobs() {
  return apiFetch<Job[]>('/jobs');
}

export function getJob(jobId: string) {
  return apiFetch<Job>(`/jobs/${jobId}`);
}

export function createJob(payload: JobInput) {
  return apiFetch<Job>('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function analyzeJob(jobId: string) {
  return apiFetch<{ requirements: { id: string; name: string; priority: string; source?: string }[] }>(`/jobs/${jobId}/analyze`, {
    method: 'POST',
  });
}

export function getCandidates() {
  return apiFetch<Candidate[]>('/candidates');
}

export function uploadCandidate(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<Candidate>('/candidates/upload', {
    method: 'POST',
    body: formData,
    timeoutMs: 120000,
  });
}

export function getTopCandidates(jobId: string) {
  return apiFetch<TopCandidatesResponse>(`/jobs/${jobId}/top-candidates`);
}

export function getCandidateSummary(candidateId: string, jobId?: string) {
  const query = jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
  return apiFetch<CandidateSummary>(`/candidates/${candidateId}/summary${query}`);
}

export function queryCandidatesNaturalLanguage(query: string, jobId?: string) {
  return apiFetch<CandidateQueryResponse>('/candidates/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, job_id: jobId ?? null }),
  });
}

export function getCandidateGroups(jobId: string) {
  return apiFetch<{ job_id: string; groups: Record<string, { candidate_id: string; name: string; match_score: number; missing_skills: string[]; unclear_areas: string[] }[]> }>(`/jobs/${jobId}/candidate-groups`);
}

export function mapCandidateToJob(jobId: string, candidateId: string) {
  return apiFetch<{
    candidate_id: string;
    job_id: string;
    overall_match: number;
    score_breakdown: Record<string, number>;
    requirement_map: { requirement: string; priority: string; status: string; evidence: string }[];
    missing_information: string[];
    summary: string;
  }>(`/jobs/${jobId}/candidates/${candidateId}/mapping`);
}

export function chatAgent(message: string) {
  return apiFetch<AgentChatResponse>('/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}

export function generateInterviewQuestions(candidateId: string, jobId: string) {
  return apiFetch<{ candidate_id: string; job_id: string; questions: { category: string; question: string; reason: string }[] }>('/interviews/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
  });
}

export function generateInterviewFollowUps(candidateId: string, jobId: string, answer: string) {
  return apiFetch<{ follow_up_questions: string[] }>('/interviews/followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, answer }),
  });
}

export function analyzeInterviewNotes(candidateId: string, jobId: string, notes: string) {
  return apiFetch<InterviewEvaluation>('/interviews/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, notes }),
  });
}

export function getEvaluations() {
  return apiFetch<InterviewEvaluation[]>('/evaluations');
}

export function getAuditEvents() {
  return apiFetch<AuditEvent[]>('/audit');
}

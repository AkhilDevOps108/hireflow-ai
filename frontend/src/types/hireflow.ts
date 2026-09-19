export type Requirement = {
  id: string;
  name: string;
  priority: string;
  source?: string;
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: Requirement[];
  created_at?: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  experience_years: number;
  skills: string[];
  projects?: string[];
  qualifications?: string[];
  unclear_information?: string[];
  source_file: string;
  created_at?: string;
};

export type RankedCandidate = {
  candidate_id: string;
  name: string;
  email: string;
  experience_years: number;
  match_score: number;
  score_breakdown?: Record<string, number>;
  matched_skills: string[];
  missing_skills: string[];
  unclear_areas?: string[];
  evidence_confidence: number;
};

export type TopCandidatesResponse = {
  job_id: string;
  candidates: RankedCandidate[];
};

export type AgentChatResponse = {
  answer: string;
  tool?: string;
  status?: string;
};

export type CandidateSummary = {
  candidate_id: string;
  name: string;
  email: string;
  experience_years: number;
  skills: string[];
  projects: string[];
  qualifications: string[];
  unclear_information: string[];
  summary: string;
};

export type CandidateQueryResult = {
  candidate_id: string;
  name: string;
  email: string;
  experience_years: number;
  skills: string[];
  match_score: number;
};

export type CandidateQueryResponse = {
  query: string;
  filters: {
    required_skills: string[];
    excluded_skills: string[];
    min_experience: number;
    min_score: number;
  };
  count: number;
  results: CandidateQueryResult[];
};

export type InterviewEvaluation = {
  id: string;
  candidate_id: string;
  job_id: string;
  requirements_validated: string[];
  requirements_unvalidated: string[];
  follow_up_questions: string[];
  summary: string;
  status: string;
  created_at?: string;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
};

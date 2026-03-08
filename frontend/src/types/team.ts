// Based on team.py schemas
export interface TeamResponse {
  members: string[];
  mean_skill: number;
  tech_stack: string[];
}

export interface OptimizedTeamMatch {
  student_id: string;
  student_username?: string;
  project_id: string;
  project_name?: string;
  compatibility_score?: number;
  skills_covered?: string[];
  missing_skills?: string[];
}

export interface OptimizedTeamsResponse {
  status: 'success' | 'error';
  total_assignments: number;
  matches: OptimizedTeamMatch[];
}

export interface BuildTeamResponse {
  student_id: string;
  assigned_project: string;
}

export interface TeamValidationResult {
  valid: boolean;
  message?: string;
  team_strength?: number;
  skill_coverage?: Record<string, number>;
  missing_skills?: string[];
  recommendations?: string[];
  member_skills?: Array<{
    student_id: string;
    username: string;
    skills: Record<string, number>;
  }>;
}

export interface TeamFormationParams {
  team_size: number;
  required_skills?: string[];
  preferred_skills?: string[];
  avoid_students?: string[];
  prioritize_diversity?: boolean;
}
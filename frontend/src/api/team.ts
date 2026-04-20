import { apiClient } from './index';

// Types based on team.py schema
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
}

export interface OptimizedTeamsResponse {
  status: 'success' | 'error';
  total_assignments: number;
  matches: OptimizedTeamMatch[];
}

export interface ProjectResponse {
  id: string;
  name: string;
  tech_stack: string[];
  member_ids: string[];
  max_team_size: number;
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
}

export interface Student {
  id: string;
  email: string;
  github_username: string;
  skills: Record<string, number>;
}

export const teamsApi = {
  /**
   * Build optimized teams across all students and projects
   * @param teamSize - Desired team size (default: 3)
   * @returns Optimized team assignments
   */
  buildOptimized: async (teamSize: number = 3) => {
    const response = await apiClient.post<OptimizedTeamsResponse>(
      '/teams/build/optimize',
      null,
      {
        params: { team_size: teamSize }
      }
    );
    return response.data;
  },

  /**
   * Build a team around a specific student
   * @param studentId - ID of the student to build team around
   * @param teamSize - Desired team size (default: 3)
   * @returns Team assignment for the specified student
   */
  buildAroundStudent: async (studentId: string, teamSize: number = 3) => {
    const response = await apiClient.post<BuildTeamResponse>(
      `/teams/build/${studentId}`,
      null,
      {
        params: { team_size: teamSize }
      }
    );
    return response.data;
  },

  /**
   * Validate a potential team
   * @param studentIds - Array of student IDs to validate as a team
   * @returns Validation results with team analysis
   */
  validateTeam: async (studentIds: string[]) => {
    const response = await apiClient.post<TeamValidationResult>(
      '/teams/validate',
      studentIds,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  },

  /**
   * Get detailed team analysis with skill breakdown
   * @param studentIds - Array of student IDs to analyze
   * @returns Detailed team analysis
   */
  analyzeTeam: async (studentIds: string[]) => {
    // First validate the team
    const validation = await teamsApi.validateTeam(studentIds);
    
    // For now, return enhanced validation
    return {
      ...validation,
      team_size: studentIds.length,
      member_ids: studentIds,
      analyzed_at: new Date().toISOString()
    };
  },

  /**
   * Manually form a team
   * @param studentIds - Array of student IDs
   * @param projectId - Optional project ID
   * @returns Success status and project info
   */
  formTeam: async (studentIds: string[], projectId?: string) => {
    const response = await apiClient.post('/teams/form', {
      student_ids: studentIds,
      project_id: projectId
    });
    return response.data;
  },

  /**
   * Get the current student's actual assigned team
   * @returns Team info or null
   */
  getMyTeam: async () => {
    const response = await apiClient.get('/teams/me');
    return response.data;
  },

  /**
   * List all available projects
   */
  listProjects: async () => {
    const response = await apiClient.get<ProjectResponse[]>('/teams/projects');
    return response.data;
  },

  /**
   * Create a new project
   */
  createProject: async (data: { name: string; tech_stack: string[]; max_team_size: number }) => {
    const response = await apiClient.post<ProjectResponse>('/teams/projects', data);
    return response.data;
  },

  /**
   * Build a team for the current user — picks best complementary teammates
   */
  buildForMe: async (projectId: string, teamSize: number = 3) => {
    const response = await apiClient.post('/teams/build/for-me', {
      project_id: projectId,
      team_size: teamSize
    });
    return response.data as {
      status: string;
      project_id: string;
      project_name: string;
      team_size: number;
      members: Array<{
        student_id: string;
        student_username: string;
        project_id: string;
        project_name: string;
        is_me: boolean;
      }>;
    };
  }
};
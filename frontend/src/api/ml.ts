import { apiClient } from './index';

export interface SkillPrediction {
  prediction: number[];
  python_improvement: number;
  javascript_improvement: number;
  cpp_improvement: number;
  teamwork_improvement: number;
  confidence: number;
  best_skill: string;
  weakest_skill: string;
  growth_roadmap: string[];
  project_fit: string;
}

export interface TeamRecommendation {
  team_id: string;
  members: Array<{
    id: string;
    username: string;
    skills: Record<string, number>;
  }>;
  compatibility_score: number;
  skill_coverage: Record<string, number>;
  explanation: string;
}

export const mlApi = {
  predictSkills: async (studentId?: string, features?: any, projectId?: string) => {
    const response = await apiClient.post<SkillPrediction>(`/ml/predict/skills${projectId ? `?project_id=${projectId}` : ''}`, {
      student_id: studentId,
      features
    });
    return response.data;
  },
  
  recommendTeam: async (projectDescription: string, requiredSkills: string[], teamSize: number = 3) => {
    const response = await apiClient.post<TeamRecommendation>('/ml/recommend/team', {
      project_description: projectDescription,
      required_skills: requiredSkills,
      team_size: teamSize
    });
    return response.data;
  }
};
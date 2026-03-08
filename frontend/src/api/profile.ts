import { apiClient } from './index';

// Types based on backend responses
export interface GitHubProfile {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  bio?: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileRepository {
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  stars: number;
  forks: number;
  language?: string;
  languages?: Record<string, number>;
  topics?: string[];
  created_at: string;
  updated_at: string;
  size: number;
}

export interface EstimatedSkills {
  [skillName: string]: number; // skill name -> proficiency level (1-5)
}

export interface DatabaseRecord {
  id: string;
  email: string;
  github_username: string;
  email_verified: boolean;
  github_verified: boolean;
  stored_skills: EstimatedSkills;
  created: boolean;
}

export interface RepositoryAnalysis {
  total_repositories: number;
  total_stars: number;
  total_forks: number;
  top_languages: string[];
}

export interface SkillComparison {
  database_skills: EstimatedSkills;
  freshly_estimated_skills: EstimatedSkills;
  skills_match: boolean;
}

export interface ProfileResponse {
  student_id: string;
  exists_in_database: boolean;
  github_profile: GitHubProfile;
  repository_analysis: RepositoryAnalysis;
  estimated_skills: EstimatedSkills;
  top_repositories: ProfileRepository[];
  database_record: DatabaseRecord;
  skill_comparison: SkillComparison;
}

export interface ProfileByGithubResponse {
  github_username: string;
  exists_in_database: boolean;
  message?: string;
  github_profile: GitHubProfile;
  estimated_skills: EstimatedSkills;
  top_repositories: ProfileRepository[];
  repository_stats: {
    total_repos: number;
    total_stars: number;
    total_forks: number;
  };
}

export interface DeletedStudentInfo {
  id: string;
  email: string;
  github_username: string;
  skills: EstimatedSkills;
  email_verified: boolean;
  github_verified: boolean;
}

export interface DeleteProfileResponse {
  message: string;
  deleted_student: DeletedStudentInfo;
}

export const profileApi = {
  /**
   * Get current user's profile (uses X-Student-ID header)
   * @returns ProfileResponse with GitHub data and skills
   */
  getMyProfile: async () => {
    // Note: This will automatically send X-Student-ID header
    // Make sure to set it in apiClient interceptors or pass it
    const response = await apiClient.get<ProfileResponse>('/profile/me');
    return response.data;
  },

  /**
   * Get user profile by student ID
   * @param studentId - The student's UUID
   * @returns ProfileResponse with GitHub data and skills
   */
  getByStudentId: async (studentId: string) => {
    const response = await apiClient.get<ProfileResponse>(`/profile/${studentId}`);
    return response.data;
  },

  /**
   * Get user profile by GitHub username
   * @param githubUsername - GitHub username
   * @returns Profile data (may be from GitHub only if not in database)
   */
  getByGithubUsername: async (githubUsername: string) => {
    const response = await apiClient.get<ProfileByGithubResponse>(`/profile/by-github/${githubUsername}`);
    return response.data;
  },

  /**
   * Delete student profile by ID
   * @param studentId - The student's UUID to delete
   * @returns Deletion confirmation with deleted student info
   */
  deleteStudent: async (studentId: string) => {
    const response = await apiClient.delete<DeleteProfileResponse>(`/profile/${studentId}`);
    return response.data;
  },

  /**
   * Refresh GitHub data for current user
   * This is a convenience method that hits the profile endpoint
   * @returns Fresh profile data from GitHub
   */
  refreshGithubData: async () => {
    // Re-fetch my profile to get latest GitHub data
    const response = await apiClient.get<ProfileResponse>('/profile/me');
    return response.data;
  }
};
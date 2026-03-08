import { apiClient } from './index';
import type { EstimatedSkills } from './profile';

// Types based on student.py schemas
export interface StudentCreate {
  email: string;
  github_username: string;
}

export interface StudentResponse {
  id: string;
  email: string;
  github_username: string;
  skills: EstimatedSkills;
  email_verified: boolean;
  github_verified: boolean;
}

export interface SkillFilterResponse {
  id: string;
  email: string;
  github_username: string;
  skills: EstimatedSkills;
  email_verified: boolean;
  github_verified: boolean;
}

export const studentsApi = {
  /**
   * Create a new student
   * @param studentData - Email and GitHub username
   * @returns Created student object with skills
   */
  create: async (studentData: StudentCreate) => {
    const response = await apiClient.post<StudentResponse>('/students/', studentData);
    return response.data;
  },

  /**
   * Get all students
   * @returns List of all students
   */
  getAll: async () => {
    const response = await apiClient.get<StudentResponse[]>('/students/');
    return response.data;
  },

  /**
   * Get student by ID
   * @param studentId - Student's UUID
   * @returns Student object
   */
  getById: async (studentId: string) => {
    const response = await apiClient.get<StudentResponse>(`/students/${studentId}`);
    return response.data;
  },

  /**
   * Get students by skill
   * @param tech - Technology/skill name (e.g., 'python', 'react')
   * @param minLevel - Minimum skill level (1-5, default: 1)
   * @returns List of students with the skill at or above minLevel
   */
  getBySkill: async (tech: string, minLevel: number = 1) => {
    const response = await apiClient.get<SkillFilterResponse[]>(`/students/skill/${tech}`, {
      params: { min_level: minLevel }
    });
    return response.data;
  },

  /**
   * Get GitHub profile by username
   * @param githubUsername - GitHub username
   * @returns GitHub profile data
   */
  getGithubProfile: async (githubUsername: string) => {
    const response = await apiClient.get(`/students/profile/${githubUsername}`);
    return response.data;
  },

  /**
   * Search students by skill with filtering
   * @param tech - Technology to search for
   * @param options - Search options
   * @returns Filtered students
   */
  searchBySkill: async (tech: string, options?: {
    minLevel?: number;
    verified?: boolean;
  }) => {
    const params: any = {};
    if (options?.minLevel) params.min_level = options.minLevel;
    // Note: verified filter might need to be applied client-side
    // as the API doesn't currently support it

    const response = await apiClient.get<SkillFilterResponse[]>(`/students/skill/${tech}`, { params });

    // Client-side filtering for verified status if needed
    let results = response.data;
    if (options?.verified !== undefined) {
      results = results.filter(s => s.email_verified === options.verified);
    }

    return results;
  },

  /**
   * Delete a student by ID
   * @param studentId - Student's UUID to delete
   */
  deleteStudent: async (studentId: string) => {
    const response = await apiClient.delete<{ message: string; deleted_student: any }>(
      `/students/${studentId}`
    );
    return response.data;
  }
};
import type { GitHubProfile } from './profile';
import type { RepoAnalysis } from './repo';

// Based on student.py schemas
export interface StudentCreate {
    email: string;
    github_username: string;
}

export interface StudentResponse {
    id: string;
    email: string;
    github_username: string;
    skills: Record<string, number>;  // technology -> skill level (1-5)
    email_verified: boolean;
    github_verified: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface StudentWithProfile extends StudentResponse {
    github_profile?: GitHubProfile;
    repo_stats?: RepoAnalysis;
}

export interface SkillFilterResponse {
    id: string;
    email: string;
    github_username: string;
    skills: Record<string, number>;
    email_verified: boolean;
    github_verified: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface SkillLevel {
    skill: string;
    level: number;  // 1-5
}

export interface StudentSearchParams {
    skill?: string;
    min_level?: number;
    verified?: boolean;
    github_connected?: boolean;
}
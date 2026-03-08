import type { Repository } from './repo';

// Based on profile.py responses
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

export interface DatabaseRecord {
    id: string;
    email: string;
    github_username: string;
    email_verified: boolean;
    github_verified: boolean;
    stored_skills: Record<string, number>;
    created: boolean;
}

export interface RepositoryAnalysis {
    total_repositories: number;
    total_stars: number;
    total_forks: number;
    top_languages: string[];
}

export interface SkillComparison {
    database_skills: Record<string, number>;
    freshly_estimated_skills: Record<string, number>;
    skills_match: boolean;
}

export interface ProfileResponse {
    student_id: string;
    exists_in_database: boolean;
    github_profile: GitHubProfile;
    repository_analysis: RepositoryAnalysis;
    estimated_skills: Record<string, number>;
    top_repositories: Repository[];
    database_record: DatabaseRecord;
    skill_comparison: SkillComparison;
}

export interface ProfileByGithubResponse {
    github_username: string;
    exists_in_database: boolean;
    message?: string;
    github_profile: GitHubProfile;
    estimated_skills: Record<string, number>;
    top_repositories: Repository[];
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
    skills: Record<string, number>;
    email_verified: boolean;
    github_verified: boolean;
}

export interface DeleteProfileResponse {
    message: string;
    deleted_student: DeletedStudentInfo;
}
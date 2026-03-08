// Based on repos.py and feature.py
export interface Repository {
  id?: number;
  name: string;
  full_name: string;
  description?: string | null;
  html_url: string;
  stars: number;
  forks: number;
  language?: string | null;
  languages?: Record<string, number>;
  topics?: string[];
  created_at: string;
  updated_at: string;
  size: number;
  
  // Additional fields from normalization
  commit_frequency?: number;
  pr_count?: number;
  issue_count?: number;
  contributors_count?: number;
  has_ci?: boolean;
  has_tests?: boolean;
  has_documentation?: boolean;
  
  // Computed fields
  rank_score?: number;
  complexity?: number;
  code_quality?: number;
}

export interface TopReposResponse {
  username: string;
  top_repos: Repository[];
}

export interface FeatureResponse {
  technologies: Record<string, number>;  // technology name -> score
}

export interface RepoAnalysis {
  total_repos: number;
  total_stars: number;
  total_forks: number;
  languages: Record<string, number>;
  topics: Record<string, number>;
  average_repo_size: number;
  most_active_repos: Repository[];
  oldest_repo?: Repository;
  newest_repo?: Repository;
  stars_per_repo_avg: number;
  forks_per_repo_avg: number;
}

export interface RepoRankingCriteria {
  stars_weight?: number;
  forks_weight?: number;
  recency_weight?: number;
  activity_weight?: number;
  community_weight?: number;
}

export interface RankedRepository extends Repository {
  rank_score: number;
  scores: {
    stars: number;
    forks: number;
    recency: number;
    activity: number;
    community: number;
  };
}

export interface RepoStats {
  total_repos: number;
  total_stars: number;
  total_forks: number;
  top_languages: Array<{ language: string; repo_count: number }>;
  top_topics: Array<{ topic: string; count: number }>;
  languages: Record<string, number>;
  topics: Record<string, number>;
}

export interface UserComparisonResult {
  user1: {
    username: string;
    stats: RepoStats;
  };
  user2: {
    username: string;
    stats: RepoStats;
  };
  comparison: {
    total_repos_diff: number;
    total_stars_diff: number;
    total_forks_diff: number;
    common_languages: string[];
    unique_languages_user1: string[];
    unique_languages_user2: string[];
  };
}
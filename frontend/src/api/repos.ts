import { apiClient } from './index';

// Types based on feature.py schema
export interface FeatureResponse {
  technologies: Record<string, number>; // technology name -> score
}

// Repository types from backend
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

export const reposApi = {
  /**
   * Get all repositories for a GitHub username
   * @param username - GitHub username
   * @returns Array of normalized repositories
   */
  getUserRepos: async (username: string) => {
    const response = await apiClient.get<Repository[]>(`/repos/${username}`);
    return response.data;
  },

  /**
   * Get top N repositories for a GitHub username
   * @param username - GitHub username
   * @param topN - Number of top repos to return (default: 3)
   * @returns Top repositories with ranking
   */
  getTopRepos: async (username: string, topN: number = 3) => {
    const response = await apiClient.get<TopReposResponse>(
      `/repos/${username}/top`,
      {
        params: { top_n: topN }
      }
    );
    return response.data;
  },

  /**
   * Get repository features/technologies
   * @param username - GitHub username
   * @returns Technology scores
   */
  getRepoFeatures: async (username: string) => {
    // This might be from a different endpoint or computed
    const repos = await reposApi.getUserRepos(username);

    // Aggregate languages across all repos
    const technologies: Record<string, number> = {};

    repos.forEach(repo => {
      if (repo.languages) {
        Object.entries(repo.languages).forEach(([lang, bytes]) => {
          technologies[lang] = (technologies[lang] || 0) + bytes;
        });
      } else if (repo.language) {
        technologies[repo.language] = (technologies[repo.language] || 0) + 1;
      }
    });

    // Normalize scores
    const total = Object.values(technologies).reduce((a, b) => a + b, 0);
    const normalized: Record<string, number> = {};

    Object.entries(technologies).forEach(([lang, value]) => {
      normalized[lang] = value / total;
    });

    return { technologies: normalized } as FeatureResponse;
  },

  /**
   * Analyze repositories for a user
   * @param username - GitHub username
   * @returns Detailed repository analysis
   */
  analyzeRepos: async (username: string): Promise<RepoAnalysis> => {
    const repos = await reposApi.getUserRepos(username);

    if (!repos.length) {
      return {
        total_repos: 0,
        total_stars: 0,
        total_forks: 0,
        languages: {},
        topics: {},
        average_repo_size: 0,
        most_active_repos: [],
        stars_per_repo_avg: 0,
        forks_per_repo_avg: 0
      };
    }

    // Calculate statistics
    const total_stars = repos.reduce((sum, repo) => sum + repo.stars, 0);
    const total_forks = repos.reduce((sum, repo) => sum + repo.forks, 0);

    // Aggregate languages
    const languages: Record<string, number> = {};
    const topics: Record<string, number> = {};

    repos.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }

      repo.topics?.forEach(topic => {
        topics[topic] = (topics[topic] || 0) + 1;
      });
    });

    // Sort repos by stars for "most active" (using stars as proxy)
    const most_active_repos = [...repos]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 5);

    // Find oldest and newest by creation date
    const sorted_by_date = [...repos].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return {
      total_repos: repos.length,
      total_stars,
      total_forks,
      languages,
      topics,
      average_repo_size: repos.reduce((sum, repo) => sum + repo.size, 0) / repos.length,
      most_active_repos,
      oldest_repo: sorted_by_date[0],
      newest_repo: sorted_by_date[sorted_by_date.length - 1],
      stars_per_repo_avg: total_stars / repos.length,
      forks_per_repo_avg: total_forks / repos.length
    };
  },

  /**
   * Rank repositories with custom criteria
   * @param repos - Array of repositories to rank
   * @param criteria - Ranking weights
   * @returns Ranked repositories with scores
   */
  rankRepos: (repos: Repository[], criteria: RepoRankingCriteria = {}) => {
    const {
      stars_weight = 1,
      forks_weight = 0.8,
      recency_weight = 0.5,
      activity_weight = 0.3,
      community_weight = 0.2
    } = criteria;

    // Normalize dates for recency calculation
    const now = new Date().getTime();
    const max_age = Math.max(
      ...repos.map(r => now - new Date(r.updated_at).getTime())
    );

    return repos.map(repo => {
      // Calculate individual scores
      const stars_score = repo.stars / (Math.max(...repos.map(r => r.stars)) || 1);
      const forks_score = repo.forks / (Math.max(...repos.map(r => r.forks)) || 1);

      const age = now - new Date(repo.updated_at).getTime();
      const recency_score = 1 - (age / max_age);

      // Activity score (based on commit frequency if available)
      const activity_score = repo.commit_frequency ?
        Math.min(repo.commit_frequency / 10, 1) : 0.5;

      // Community score (contributors + issues + PRs)
      const community_score = (
        (repo.contributors_count || 0) * 0.4 +
        (repo.issue_count || 0) * 0.3 +
        (repo.pr_count || 0) * 0.3
      ) / 100; // Normalize

      // Calculate weighted total
      const total_score =
        stars_score * stars_weight +
        forks_score * forks_weight +
        recency_score * recency_weight +
        activity_score * activity_weight +
        community_score * community_weight;

      return {
        ...repo,
        rank_score: total_score,
        scores: {
          stars: stars_score,
          forks: forks_score,
          recency: recency_score,
          activity: activity_score,
          community: community_score
        }
      };
    }).sort((a, b) => (b.rank_score || 0) - (a.rank_score || 0));
  },

  /**
   * Search repositories by language
   * @param username - GitHub username
   * @param language - Language to filter by
   */
  getReposByLanguage: async (username: string, language: string) => {
    const repos = await reposApi.getUserRepos(username);
    return repos.filter(repo =>
      repo.language?.toLowerCase() === language.toLowerCase() ||
      Object.keys(repo.languages || {}).some(lang =>
        lang.toLowerCase() === language.toLowerCase()
      )
    );
  },

  /**
   * Get repository statistics summary
   * @param username - GitHub username
   */
  getRepoStats: async (username: string) => {
    const analysis = await reposApi.analyzeRepos(username);

    return {
      ...analysis,
      top_languages: Object.entries(analysis.languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([lang, count]) => ({ language: lang, repo_count: count })),
      top_topics: Object.entries(analysis.topics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }))
    };
  },

  /**
   * Compare repositories between two users
   * @param username1 - First GitHub username
   * @param username2 - Second GitHub username
   */
  compareUsers: async (username1: string, username2: string) => {
    await Promise.all([
      reposApi.getUserRepos(username1),
      reposApi.getUserRepos(username2)
    ]);

    const stats1 = await reposApi.getRepoStats(username1);
    const stats2 = await reposApi.getRepoStats(username2);

    return {
      user1: {
        username: username1,
        ...stats1
      },
      user2: {
        username: username2,
        ...stats2
      },
      comparison: {
        total_repos_diff: stats1.total_repos - stats2.total_repos,
        total_stars_diff: stats1.total_stars - stats2.total_stars,
        total_forks_diff: stats1.total_forks - stats2.total_forks,
        common_languages: Object.keys(stats1.languages).filter(
          lang => stats2.languages[lang]
        )
      }
    };
  }
};
// types/index.ts
export interface TechStack {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;
}

export interface Student {
  id: string;
  enrollment_number?: string;
  name: string;
  github_username: string;
  avatar_url: string;
  bio: string;
  email?: string;
  college?: string;
  public_repos: number;
  followers: number;
  following: number;
  total_stars: number;
  total_forks: number;
  tech_stack: TechStack[];
  languages: { [key: string]: number };
  projects: string[];
  seeking: string[];
  github_analysis?: any;
  ai_analysis?: any;
  compatibility_scores?: { [key: string]: number };
  last_updated: string;
  created_at: string;
  is_active: boolean;
}

export interface TeamMember {
  student: Student;
  compatibility_score: number;
  role: string;
  strengths: string[];
}

export interface TeamSuggestion {
  members: TeamMember[];
  reasoning: string;
  required_skills: string[];
  total_score: number;
  created_at: string;
}

export interface SkillGapAnalysis {
  student_name: string;
  required_skills: string[];
  covered: string[];
  partial: string[];
  missing: string[];
  coverage_score: number;
}

export interface TrendingTech {
  trending_technologies: Array<[string, number]>;
  trending_languages: Array<[string, number]>;
  total_students: number;
}

export interface SearchResult {
  technology: string;
  min_confidence: number;
  total_matches: number;
  matches: Array<{
    id: string;
    name: string;
    github_username: string;
    confidence: number;
    level: string;
    avatar_url: string;
  }>;
}
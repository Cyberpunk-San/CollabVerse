# app/schemas.py
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Dict, Any, Optional
from datetime import datetime


# -------------------------------------------------------
# 🔹 TECHNOLOGY & GITHUB MODELS
# -------------------------------------------------------

class TechStack(BaseModel):
    """Represents a detected technology and proficiency."""
    name: str
    level: str = Field(..., description="beginner | intermediate | advanced | expert")
    confidence: float = Field(..., ge=0, le=100)


class GitHubStats(BaseModel):
    """Summarized GitHub statistics."""
    repos: int = 0
    followers: int = 0
    stars: int = 0
    forks: int = 0
    languages: Dict[str, float] = {}


class GitHubAnalysis(BaseModel):
    """Raw GitHub analysis payload for debugging or review."""
    user_data: Dict[str, Any] = {}
    repos_data: List[Dict[str, Any]] = []
    starred_data: List[Dict[str, Any]] = []


# -------------------------------------------------------
# 🔹 STUDENT MODELS
# -------------------------------------------------------

class StudentBase(BaseModel):
    enrollment_number: Optional[str] = None
    name: str
    github_username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    college: Optional[str] = None


class StudentCreate(StudentBase):
    """Schema for manual student creation (no GitHub AI)."""
    pass


class AIAnalysis(BaseModel):
    """AI-generated analysis from Ollama."""
    technical_skills: List[Dict[str, Any]] = []
    experience_level: str = "intermediate"
    specialization_areas: List[str] = []
    collaboration_strengths: List[str] = []
    learning_interests: List[str] = []


class StudentResponse(StudentBase):
    """Full student schema for DB → API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_repos: int = 0
    followers: int = 0
    following: int = 0
    total_stars: int = 0
    total_forks: int = 0
    tech_stack: List[TechStack] = []
    languages: Dict[str, float] = {}
    projects: List[str] = []
    seeking: List[str] = []
    github_analysis: Optional[GitHubAnalysis] = None
    ai_analysis: Optional[AIAnalysis] = None
    compatibility_scores: Dict[str, float] = {}
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None
    is_active: bool = True

    # Validators to handle None values from database
    @field_validator('tech_stack', mode='before')
    @classmethod
    def validate_tech_stack(cls, v):
        if v is None:
            return []
        return v

    @field_validator('languages', 'compatibility_scores', mode='before')
    @classmethod
    def validate_dicts(cls, v):
        if v is None:
            return {}
        return v

    @field_validator('projects', 'seeking', mode='before')
    @classmethod
    def validate_lists(cls, v):
        if v is None:
            return []
        return v

    @field_validator('github_analysis', mode='before')
    @classmethod
    def validate_github_analysis(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return GitHubAnalysis(**v)
        return v

    @field_validator('ai_analysis', mode='before')
    @classmethod
    def validate_ai_analysis(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return AIAnalysis(**v)
        return v


# -------------------------------------------------------
# 🔹 TEAM MODELS
# -------------------------------------------------------

class TeamMember(BaseModel):
    """Represents a student in a recommended team."""
    student: StudentResponse
    compatibility_score: float = Field(..., ge=0, le=10)
    role: str
    strengths: List[str] = []


class TeamRequest(BaseModel):
    """Request payload for AI team suggestion."""
    main_student_id: str
    required_skills: List[str] = []
    team_size: int = Field(4, ge=2, le=10, description="Number of team members including leader")


class TeamResponse(BaseModel):
    """Response payload for AI team suggestion."""
    members: List[TeamMember] = []
    reasoning: str
    required_skills: List[str] = []
    total_score: float
    created_at: datetime


class SkillGapResponse(BaseModel):
    """Response for /skills/analyze-gaps."""
    student_name: str
    required_skills: List[str] = []
    covered: List[str] = []
    partial: List[str] = []
    missing: List[str] = []
    coverage_score: float


# -------------------------------------------------------
# 🔹 ANALYTICS & SEARCH MODELS
# -------------------------------------------------------

class TechnologyTrend(BaseModel):
    """Represents trending technologies or languages."""
    name: str
    count: int


class TrendingResponse(BaseModel):
    trending_technologies: List[TechnologyTrend] = []
    trending_languages: List[TechnologyTrend] = []
    total_students: int = 0


class SearchResult(BaseModel):
    """Result of searching students by a given technology."""
    student_id: str
    name: str
    github_username: str
    confidence: float
    level: str
    matching_skills: List[Dict[str, str]] = []
    experience_level: Optional[str] = None


class TechnologySearchResponse(BaseModel):
    """Response for /github/search."""
    technology: str
    min_confidence: int
    total_matches: int
    matches: List[SearchResult] = []


# -------------------------------------------------------
# 🔹 ADMIN / SYSTEM MODELS
# -------------------------------------------------------

class GitHubAnalysisRequest(BaseModel):
    username: str
    enrollment_number: Optional[str] = None


class HealthResponse(BaseModel):
    message: str
    status: str
    version: str
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class GitHubProfile(BaseModel):
    login: str
    avatar_url: str
    html_url: str
    name: Optional[str] = None
    company: Optional[str] = None
    blog: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    public_repos: int
    followers: int
    following: int

class ProfileResponse(BaseModel):
    id: str
    email: str
    github_username: str
    github_verified: bool
    skills: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    github_profile: Optional[GitHubProfile] = None
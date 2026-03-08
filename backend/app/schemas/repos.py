from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Repository(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    html_url: str
    stargazers_count: int
    forks_count: int
    language: Optional[str] = None
    updated_at: datetime
    created_at: datetime
    topics: List[str] = []

class TopReposResponse(BaseModel):
    username: str
    repositories: List[Repository]
    total_count: int
    analyzed_at: datetime
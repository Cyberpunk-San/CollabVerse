from pydantic import BaseModel
from typing import List
class TeamResponse(BaseModel):
    members: List[str]
    mean_skill: float
    tech_stack: List[str]

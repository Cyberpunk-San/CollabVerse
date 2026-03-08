from pydantic import BaseModel
from typing import Dict
class FeatureResponse(BaseModel):
    technologies: Dict[str, float]

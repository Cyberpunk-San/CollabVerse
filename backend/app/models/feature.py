from sqlalchemy import Column, String, JSON, ForeignKey
from app.core.database import Base


class Feature(Base):
    __tablename__ = "features"

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id"), index=True)
    features = Column(JSON)

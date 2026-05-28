from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SubmissionResponse(BaseModel):
    id: int
    student_id: int
    original_filename: str
    content_type: Optional[str]
    file_size: int
    description: Optional[str]
    task_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

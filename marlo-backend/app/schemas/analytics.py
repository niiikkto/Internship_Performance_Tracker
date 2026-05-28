from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional


class AttendanceStatusEnum(str, Enum):
    present = "present"
    absent = "absent"
    late = "late"
    excused = "excused"


class AttendanceCreate(BaseModel):
    student_id: int
    date: datetime
    status: AttendanceStatusEnum = AttendanceStatusEnum.present
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatusEnum] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    date: datetime
    status: AttendanceStatusEnum
    notes: Optional[str] = None
    marked_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttendanceDetailResponse(AttendanceResponse):
    student_name: Optional[str] = None


# ==================== FEEDBACK ====================

class FeedbackTypeEnum(str, Enum):
    general = "general"
    task = "task"
    performance = "performance"


class FeedbackCreate(BaseModel):
    student_id: int
    content: str = Field(..., min_length=1, max_length=2000)
    score: Optional[float] = Field(None, ge=0, le=100)
    task_id: Optional[int] = None
    feedback_type: FeedbackTypeEnum = FeedbackTypeEnum.general


class FeedbackUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    score: Optional[float] = Field(None, ge=0, le=100)


class FeedbackResponse(BaseModel):
    id: int
    student_id: int
    author_id: int
    task_id: Optional[int]
    content: str
    score: Optional[float]
    feedback_type: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeedbackDetailResponse(FeedbackResponse):
    student_name: Optional[str] = None
    author_name: Optional[str] = None
    task_title: Optional[str] = None

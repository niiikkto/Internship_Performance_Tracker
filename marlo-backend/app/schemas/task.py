from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional, List


class TaskStatusEnum(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"
    overdue = "overdue"


# ==================== TASK ====================

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: datetime


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[TaskStatusEnum] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    creator_id: int
    due_date: datetime
    status: TaskStatusEnum
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskDetailResponse(TaskResponse):
    assignments: List["TaskAssignmentResponse"] = []


# ==================== TASK ASSIGNMENT ====================

class TaskAssignmentCreate(BaseModel):
    task_id: int
    student_ids: List[int] = Field(..., min_length=1)


class TaskAssignmentUpdate(BaseModel):
    status: Optional[TaskStatusEnum] = None
    feedback: Optional[str] = None


class TaskAssignmentResponse(BaseModel):
    id: int
    task_id: int
    student_id: int
    status: TaskStatusEnum
    completed_at: Optional[datetime] = None
    feedback: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskAssignmentDetailResponse(TaskAssignmentResponse):
    task: TaskResponse
    student: "StudentMinResponse"


# ==================== KPI TEMPLATE ====================

class KPITemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    weight: float = Field(..., gt=0, le=100)
    max_value: float = Field(100.0, gt=0)


class KPITemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    weight: Optional[float] = Field(None, gt=0, le=100)
    max_value: Optional[float] = Field(None, gt=0)


class KPITemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    weight: float
    max_value: float
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== STUDENT KPI VALUE ====================

class StudentKPIValueCreate(BaseModel):
    student_id: int
    template_id: int
    value: float = Field(..., ge=0)


class StudentKPIValueUpdate(BaseModel):
    value: float = Field(..., ge=0)


class StudentKPIValueResponse(BaseModel):
    id: int
    student_id: int
    template_id: int
    value: float
    calculated_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StudentKPIDetailResponse(StudentKPIValueResponse):
    template: KPITemplateResponse


# ==================== STUDENT PERFORMANCE & RANKING ====================

class StudentPerformanceResponse(BaseModel):
    id: int
    student_id: int
    performance_score: float
    tasks_completed: int
    tasks_on_time: int
    tasks_total: int
    calculated_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StudentRankingResponse(BaseModel):
    student_id: int
    full_name: str
    email: str
    performance_score: float
    rank: int
    tasks_completed: int
    tasks_on_time: int
    tasks_total: int


# ==================== TIMELINE ====================

class TimelineEventResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    description: Optional[str]
    event_meta: dict
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== HELPER SCHEMAS ====================

class StudentMinResponse(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True


class StudentTasksResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    creator_id: int
    due_date: datetime
    status: TaskStatusEnum
    assignment: Optional[TaskAssignmentResponse] = None


# Update forward references
TaskDetailResponse.model_rebuild()
TaskAssignmentDetailResponse.model_rebuild()
StudentKPIDetailResponse.model_rebuild()

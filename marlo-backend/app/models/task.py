from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float, JSON, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class TaskStatusEnum(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"
    overdue = "overdue"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    creator = relationship("User", foreign_keys=[creator_id], backref="created_tasks")
    assignments = relationship("TaskAssignment", back_populates="task", cascade="all, delete-orphan")

class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.pending, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    task = relationship("Task", back_populates="assignments")
    student = relationship("User", foreign_keys=[student_id], backref="assigned_tasks")

class KPITemplate(Base):
    __tablename__ = "kpi_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    weight = Column(Float, nullable=False)  # вес в % (сумма всех весов = 100)
    max_value = Column(Float, default=100.0)  # максимальное значение (обычно 100)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by], backref="created_kpi_templates")
    kpi_values = relationship("StudentKPIValue", back_populates="template", cascade="all, delete-orphan")

class StudentKPIValue(Base):
    __tablename__ = "student_kpi_values"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(Integer, ForeignKey("kpi_templates.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)  # 0-100 (или до max_value)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    student = relationship("User", foreign_keys=[student_id], backref="kpi_values")
    template = relationship("KPITemplate", back_populates="kpi_values")

class StudentPerformance(Base):
    __tablename__ = "student_performance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    performance_score = Column(Float, default=0.0)  # взвешенная сумма всех KPI
    tasks_completed = Column(Integer, default=0)
    tasks_on_time = Column(Integer, default=0)
    tasks_total = Column(Integer, default=0)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    student = relationship("User", foreign_keys=[student_id], backref="performance")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False, index=True)  # task_assigned, task_completed, feedback_added, kpi_updated
    description = Column(Text, nullable=True)
    event_meta = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", back_populates="timeline")
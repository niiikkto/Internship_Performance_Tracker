from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
import io
import csv

from app.database import get_db
from app.core.dependencies import get_current_user, require_manager, require_admin
from app.models.user import User, RoleEnum
from app.models.feedback import Feedback
from app.models.attendance import Attendance
from app.models.task import Task, TaskAssignment, TaskStatusEnum
from app.schemas.analytics import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    FeedbackCreate, FeedbackResponse,
)
from app.services.analytics_service import (
    FeedbackService, AttendanceService, AnalyticsService,
)

router = APIRouter(prefix="/api/v1", tags=["analytics"])


# ==================== ATTENDANCE ====================

@router.post("/attendance", response_model=AttendanceResponse)
async def mark_attendance(
    attendance_data: AttendanceCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Отметить посещаемость студента (только менеджер/админ)"""
    result = await db.execute(select(User).where(User.id == attendance_data.student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    if student.role != RoleEnum.student:
        raise HTTPException(status_code=400, detail="Указанный пользователь не является студентом")

    attendance = await AttendanceService.mark_attendance(db, attendance_data, current_user.id)
    await db.commit()
    return attendance


# !!! ВАЖНО: /attendance/my-attendance ОБЯЗАТЕЛЬНО раньше /attendance/{student_id},
# иначе FastAPI решит, что "my-attendance" — это значение student_id и упадёт с 422.
@router.get("/attendance/my-attendance", response_model=dict)
async def get_my_attendance(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить свою посещаемость (только для студентов)"""
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Этот endpoint только для студентов")

    attendance_records, total = await AttendanceService.get_attendance_by_student(
        db, current_user.id, start_date, end_date, skip, limit
    )
    attendance_rate = await AttendanceService.calculate_attendance_rate(
        db, current_user.id, start_date, end_date
    )

    return {
        "student_id": current_user.id,
        "attendance_rate": round(attendance_rate, 2),
        "items": [AttendanceResponse.model_validate(a) for a in attendance_records],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/attendance/{student_id}", response_model=dict)
async def get_student_attendance(
    student_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Получить посещаемость студента (только менеджер/админ)"""
    attendance_records, total = await AttendanceService.get_attendance_by_student(
        db, student_id, start_date, end_date, skip, limit
    )
    attendance_rate = await AttendanceService.calculate_attendance_rate(
        db, student_id, start_date, end_date
    )

    return {
        "student_id": student_id,
        "attendance_rate": round(attendance_rate, 2),
        "items": [AttendanceResponse.model_validate(a) for a in attendance_records],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.put("/attendance/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    update_data: AttendanceUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Обновить запись посещаемости (только менеджер/админ)"""
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    attendance = result.scalar_one_or_none()

    if not attendance:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(attendance, key, value)

    await db.commit()
    await db.refresh(attendance)
    return attendance


# ==================== FEEDBACK ====================

@router.post("/feedback", response_model=FeedbackResponse)
async def create_feedback(
    feedback_data: FeedbackCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Создать feedback для студента (только менеджер/админ)"""
    result = await db.execute(select(User).where(User.id == feedback_data.student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    if student.role != RoleEnum.student:
        raise HTTPException(status_code=400, detail="Указанный пользователь не является студентом")

    feedback = await FeedbackService.create_feedback(db, feedback_data, current_user.id)
    await db.commit()
    return feedback


# !!! Так же: /feedback/my-feedback раньше /feedback/{student_id}
@router.get("/feedback/my-feedback", response_model=dict)
async def get_my_feedback(
    feedback_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить свой feedback (только для студентов)"""
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Этот endpoint только для студентов")

    feedbacks, total = await FeedbackService.get_feedback_by_student(
        db, current_user.id, skip, limit, feedback_type
    )
    avg_score = await FeedbackService.get_average_score(db, current_user.id)

    return {
        "student_id": current_user.id,
        "average_score": round(avg_score, 2) if avg_score else None,
        "items": [FeedbackResponse.model_validate(f) for f in feedbacks],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/feedback/{student_id}", response_model=dict)
async def get_student_feedback(
    student_id: int,
    feedback_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Получить feedback по студенту (только менеджер/админ)"""
    feedbacks, total = await FeedbackService.get_feedback_by_student(
        db, student_id, skip, limit, feedback_type
    )
    avg_score = await FeedbackService.get_average_score(db, student_id)

    return {
        "student_id": student_id,
        "average_score": round(avg_score, 2) if avg_score else None,
        "items": [FeedbackResponse.model_validate(f) for f in feedbacks],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ==================== DASHBOARD & ANALYTICS ====================

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    stats = await AnalyticsService.get_dashboard_stats(db)
    return stats


@router.get("/overdue-tasks", response_model=dict)
async def get_overdue_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    overdue_tasks, total = await AnalyticsService.get_overdue_tasks(db, skip, limit)
    return {
        "items": [
            {
                "assignment_id": t.id,
                "task_id": t.task_id,
                "task_title": t.task.title,
                "student_id": t.student_id,
                "student_name": t.student.full_name,
                "due_date": t.task.due_date,
                "status": t.status.value,
                "days_overdue": (datetime.utcnow() - t.task.due_date).days,
            }
            for t in overdue_tasks
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/top-performers", response_model=dict)
async def get_top_performers(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    performers = await AnalyticsService.get_top_performers(db, limit)
    return {"items": performers, "total": len(performers)}


@router.get("/reports/my-report")
async def get_my_report(
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Только для студентов")
    return await _build_student_report(db, current_user.id, format)


@router.get("/reports/student/{student_id}")
async def generate_student_report(
    student_id: int,
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == RoleEnum.student and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    return await _build_student_report(db, student_id, format)


async def _build_student_report(db: AsyncSession, student_id: int, format: str):
    report = await AnalyticsService.generate_student_report(db, student_id)
    if not report:
        raise HTTPException(status_code=404, detail="Студент не найден")

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Student Report"])
        writer.writerow(["Student ID", report["student"]["id"]])
        writer.writerow(["Full Name", report["student"]["full_name"]])
        writer.writerow(["Email", report["student"]["email"]])
        writer.writerow([])
        writer.writerow(["Performance"])
        writer.writerow(["Score", report["performance"]["score"]])
        writer.writerow(["Tasks Completed", report["performance"]["tasks_completed"]])
        writer.writerow(["Tasks On Time", report["performance"]["tasks_on_time"]])
        writer.writerow(["Tasks Total", report["performance"]["tasks_total"]])
        writer.writerow([])
        writer.writerow(["Attendance"])
        writer.writerow(["Rate", report["attendance"]["rate"]])
        writer.writerow(["Total Records", report["attendance"]["total_records"]])
        writer.writerow([])
        writer.writerow(["Feedback"])
        writer.writerow(["Average Score", report["feedback"]["average_score"]])
        writer.writerow(["Total Feedbacks", report["feedback"]["total_feedbacks"]])
        writer.writerow([])
        writer.writerow(["Tasks by Status"])
        for status_name, count in report["tasks"]["by_status"].items():
            writer.writerow([status_name, count])
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=student_{student_id}_report.csv"},
        )

    return report


@router.get("/stats/period", response_model=dict)
async def get_period_stats(
    period: str = Query("week", regex="^(week|month)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    stats = await AnalyticsService.get_weekly_monthly_stats(db, period, start_date, end_date)
    return stats

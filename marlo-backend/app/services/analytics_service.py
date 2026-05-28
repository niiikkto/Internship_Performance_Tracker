from sqlalchemy import select, and_, or_, func, desc, extract, case
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict
from app.models.feedback import Feedback
from app.models.attendance import Attendance, AttendanceStatusEnum
from app.models.task import Task, TaskAssignment, TaskStatusEnum, StudentPerformance
from app.models.user import User, RoleEnum
from app.schemas.analytics import FeedbackCreate, FeedbackUpdate, AttendanceCreate, AttendanceUpdate


class FeedbackService:
    """Сервис для управления обратной связью"""

    @staticmethod
    async def create_feedback(
        db: AsyncSession,
        feedback_data: FeedbackCreate,
        author_id: int
    ) -> Feedback:
        """Создать feedback"""
        feedback = Feedback(
            student_id=feedback_data.student_id,
            author_id=author_id,
            content=feedback_data.content,
            score=feedback_data.score,
            task_id=feedback_data.task_id,
            feedback_type=feedback_data.feedback_type.value
        )
        db.add(feedback)
        await db.flush()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def get_feedback_by_student(
        db: AsyncSession,
        student_id: int,
        skip: int = 0,
        limit: int = 50,
        feedback_type: Optional[str] = None
    ) -> Tuple[List[Feedback], int]:
        """Получить feedback по студенту"""
        query = select(Feedback).where(Feedback.student_id == student_id)
        
        if feedback_type:
            query = query.where(Feedback.feedback_type == feedback_type)

        count_result = await db.execute(
            select(func.count(Feedback.id)).where(
                and_(
                    Feedback.student_id == student_id,
                    Feedback.feedback_type == feedback_type if feedback_type else True
                )
            )
        )
        total = count_result.scalar() or 0

        query = query.order_by(desc(Feedback.created_at)).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def get_all_feedback(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        student_id: Optional[int] = None,
        author_id: Optional[int] = None
    ) -> Tuple[List[Feedback], int]:
        """Получить все feedback с фильтрацией"""
        query = select(Feedback)
        
        if student_id:
            query = query.where(Feedback.student_id == student_id)
        if author_id:
            query = query.where(Feedback.author_id == author_id)

        count_query = select(func.count(Feedback.id))
        if student_id:
            count_query = count_query.where(Feedback.student_id == student_id)
        if author_id:
            count_query = count_query.where(Feedback.author_id == author_id)

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        query = query.order_by(desc(Feedback.created_at)).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def update_feedback(
        db: AsyncSession,
        feedback: Feedback,
        update_data: FeedbackUpdate
    ) -> Feedback:
        """Обновить feedback"""
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(feedback, key, value)
        await db.flush()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def delete_feedback(db: AsyncSession, feedback: Feedback) -> None:
        """Удалить feedback"""
        await db.delete(feedback)

    @staticmethod
    async def get_average_score(
        db: AsyncSession,
        student_id: Optional[int] = None
    ) -> Optional[float]:
        """Получить средний score feedback"""
        query = select(func.avg(Feedback.score)).where(Feedback.score.isnot(None))
        
        if student_id:
            query = query.where(Feedback.student_id == student_id)

        result = await db.execute(query)
        return result.scalar()


class AttendanceService:
    """Сервис для управления посещаемостью"""

    @staticmethod
    async def mark_attendance(
        db: AsyncSession,
        attendance_data: AttendanceCreate,
        marked_by: int
    ) -> Attendance:
        """Отметить посещаемость"""
        # Проверить существующую запись
        existing = await db.execute(
            select(Attendance).where(
                and_(
                    Attendance.student_id == attendance_data.student_id,
                    func.date(Attendance.date) == func.date(attendance_data.date)
                )
            )
        )
        attendance = existing.scalar_one_or_none()

        if attendance:
            # Обновить существующую
            attendance.status = attendance_data.status
            attendance.notes = attendance_data.notes
            attendance.marked_by = marked_by
            attendance.updated_at = datetime.utcnow()
        else:
            # Создать новую
            attendance = Attendance(
                student_id=attendance_data.student_id,
                date=attendance_data.date,
                status=attendance_data.status,
                notes=attendance_data.notes,
                marked_by=marked_by
            )
            db.add(attendance)

        await db.flush()
        await db.refresh(attendance)
        return attendance

    @staticmethod
    async def get_attendance_by_student(
        db: AsyncSession,
        student_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Attendance], int]:
        """Получить посещаемость студента"""
        query = select(Attendance).where(Attendance.student_id == student_id)
        
        if start_date:
            query = query.where(Attendance.date >= start_date)
        if end_date:
            query = query.where(Attendance.date <= end_date)

        count_query = select(func.count(Attendance.id)).where(Attendance.student_id == student_id)
        if start_date:
            count_query = count_query.where(Attendance.date >= start_date)
        if end_date:
            count_query = count_query.where(Attendance.date <= end_date)

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        query = query.order_by(desc(Attendance.date)).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def calculate_attendance_rate(
        db: AsyncSession,
        student_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> float:
        """Рассчитать attendance rate (% присутствий)"""
        query = select(func.count(Attendance.id)).where(
            Attendance.status.in_([AttendanceStatusEnum.present, AttendanceStatusEnum.late])
        )
        
        total_query = select(func.count(Attendance.id))

        if student_id:
            query = query.where(Attendance.student_id == student_id)
            total_query = total_query.where(Attendance.student_id == student_id)
        
        if start_date:
            query = query.where(Attendance.date >= start_date)
            total_query = total_query.where(Attendance.date >= start_date)
        if end_date:
            query = query.where(Attendance.date <= end_date)
            total_query = total_query.where(Attendance.date <= end_date)

        present_count = await db.execute(query)
        total_count = await db.execute(total_query)
        
        present = present_count.scalar() or 0
        total = total_count.scalar() or 0

        return (present / total * 100) if total > 0 else 0.0


class AnalyticsService:
    """Сервис для аналитики и дашборда"""

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> Dict:
        """Получить статистику для дашборда"""
        # Средний performance score
        avg_performance_result = await db.execute(
            select(func.avg(StudentPerformance.performance_score))
        )
        avg_performance = avg_performance_result.scalar() or 0.0

        # Средний attendance rate
        avg_attendance = await AttendanceService.calculate_attendance_rate(db)

        # Средний feedback score
        avg_feedback = await FeedbackService.get_average_score(db)

        # Общее количество студентов
        students_count = await db.execute(
            select(func.count(User.id)).where(User.role == RoleEnum.student)
        )

        # Активные задачи
        active_tasks = await db.execute(
            select(func.count(Task.id)).where(
                Task.status.in_([TaskStatusEnum.pending, TaskStatusEnum.in_progress])
            )
        )

        # Просроченные задачи
        overdue_tasks = await db.execute(
            select(func.count(Task.id)).where(Task.status == TaskStatusEnum.overdue)
        )

        return {
            "avg_performance_score": round(avg_performance, 2),
            "avg_attendance_rate": round(avg_attendance, 2),
            "avg_feedback_score": round(avg_feedback, 2) if avg_feedback else None,
            "total_students": students_count.scalar() or 0,
            "active_tasks": active_tasks.scalar() or 0,
            "overdue_tasks": overdue_tasks.scalar() or 0
        }

    @staticmethod
    async def get_overdue_tasks(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[TaskAssignment], int]:
        """Получить просроченные задачи"""
        query = (
            select(TaskAssignment)
            .options(selectinload(TaskAssignment.task), selectinload(TaskAssignment.student))
            .join(Task)
            .where(
                and_(
                    TaskAssignment.status.in_([TaskStatusEnum.pending, TaskStatusEnum.in_progress, TaskStatusEnum.overdue]),
                    Task.due_date < datetime.utcnow()
                )
            )
        )

        count_query = (
            select(func.count(TaskAssignment.id))
            .join(Task)
            .where(
                and_(
                    TaskAssignment.status.in_([TaskStatusEnum.pending, TaskStatusEnum.in_progress, TaskStatusEnum.overdue]),
                    Task.due_date < datetime.utcnow()
                )
            )
        )

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        query = query.order_by(Task.due_date).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def get_top_performers(
        db: AsyncSession,
        limit: int = 10
    ) -> List[Dict]:
        """Получить top performers"""
        result = await db.execute(
            select(User, StudentPerformance)
            .join(StudentPerformance, User.id == StudentPerformance.student_id)
            .where(User.role == RoleEnum.student)
            .order_by(desc(StudentPerformance.performance_score))
            .limit(limit)
        )

        performers = []
        for user, performance in result.all():
            # Рассчитать attendance rate для студента
            attendance_rate = await AttendanceService.calculate_attendance_rate(db, student_id=user.id)
            
            performers.append({
                "student_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "performance_score": performance.performance_score,
                "tasks_completed": performance.tasks_completed,
                "tasks_total": performance.tasks_total,
                "attendance_rate": round(attendance_rate, 2)
            })

        return performers

    @staticmethod
    async def generate_student_report(
        db: AsyncSession,
        student_id: int
    ) -> Dict:
        """Генерация отчёта по студенту"""
        # Получить студента
        result = await db.execute(select(User).where(User.id == student_id))
        student = result.scalar_one_or_none()
        if not student:
            return None

        # Performance
        perf_result = await db.execute(
            select(StudentPerformance).where(StudentPerformance.student_id == student_id)
        )
        performance = perf_result.scalar_one_or_none()

        # Feedback
        feedbacks, feedback_total = await FeedbackService.get_feedback_by_student(db, student_id, limit=100)
        avg_feedback = await FeedbackService.get_average_score(db, student_id)

        # Attendance
        attendance_records, attendance_total = await AttendanceService.get_attendance_by_student(db, student_id, limit=100)
        attendance_rate = await AttendanceService.calculate_attendance_rate(db, student_id)

        # Tasks
        tasks_result = await db.execute(
            select(TaskAssignment).where(TaskAssignment.student_id == student_id)
        )
        tasks = tasks_result.scalars().all()
        
        tasks_by_status = {
            "pending": 0,
            "in_progress": 0,
            "done": 0,
            "overdue": 0
        }
        for task in tasks:
            tasks_by_status[task.status.value] = tasks_by_status.get(task.status.value, 0) + 1

        report = {
            "student": {
                "id": student.id,
                "full_name": student.full_name,
                "email": student.email,
                "role": student.role.value
            },
            "performance": {
                "score": performance.performance_score if performance else 0.0,
                "tasks_completed": performance.tasks_completed if performance else 0,
                "tasks_on_time": performance.tasks_on_time if performance else 0,
                "tasks_total": performance.tasks_total if performance else 0
            },
            "attendance": {
                "rate": round(attendance_rate, 2),
                "total_records": attendance_total,
                "records": [
                    {
                        "date": record.date,
                        "status": record.status.value,
                        "notes": record.notes
                    }
                    for record in attendance_records[:10]
                ]
            },
            "feedback": {
                "average_score": round(avg_feedback, 2) if avg_feedback else None,
                "total_feedbacks": feedback_total,
                "recent_feedbacks": [
                    {
                        "content": fb.content,
                        "score": fb.score,
                        "type": fb.feedback_type,
                        "created_at": fb.created_at
                    }
                    for fb in feedbacks[:5]
                ]
            },
            "tasks": {
                "total": len(tasks),
                "by_status": tasks_by_status
            },
            "generated_at": datetime.utcnow()
        }

        return report

    @staticmethod
    async def get_weekly_monthly_stats(
        db: AsyncSession,
        period: str = "week",  # week или month
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """Статистика по неделям/месяцам"""
        if not start_date:
            if period == "week":
                start_date = datetime.utcnow() - timedelta(weeks=4)
            else:
                start_date = datetime.utcnow() - timedelta(days=90)
        
        if not end_date:
            end_date = datetime.utcnow()

        # Attendance по периодам
        attendance_query = select(
            extract('year', Attendance.date).label('year'),
            extract('month' if period == 'month' else 'week', Attendance.date).label('period'),
            func.count(Attendance.id).label('total'),
            func.sum(
                case(
                    (Attendance.status.in_([AttendanceStatusEnum.present, AttendanceStatusEnum.late]), 1),
                    else_=0
                )
            ).label('present')
        ).where(
            and_(
                Attendance.date >= start_date,
                Attendance.date <= end_date
            )
        ).group_by(
            extract('year', Attendance.date),
            extract('month' if period == 'month' else 'week', Attendance.date)
        )

        attendance_result = await db.execute(attendance_query)
        attendance_stats = []
        for row in attendance_result:
            attendance_stats.append({
                "year": int(row.year),
                "period": int(row.period),
                "total": row.total,
                "present": row.present,
                "rate": round((row.present / row.total * 100) if row.total > 0 else 0, 2)
            })

        # Tasks completion по периодам
        tasks_query = select(
            extract('year', TaskAssignment.completed_at).label('year'),
            extract('month' if period == 'month' else 'week', TaskAssignment.completed_at).label('period'),
            func.count(TaskAssignment.id).label('completed')
        ).where(
            and_(
                TaskAssignment.status == TaskStatusEnum.done,
                TaskAssignment.completed_at >= start_date,
                TaskAssignment.completed_at <= end_date
            )
        ).group_by(
            extract('year', TaskAssignment.completed_at),
            extract('month' if period == 'month' else 'week', TaskAssignment.completed_at)
        )

        tasks_result = await db.execute(tasks_query)
        tasks_stats = []
        for row in tasks_result:
            tasks_stats.append({
                "year": int(row.year),
                "period": int(row.period),
                "completed": row.completed
            })

        return {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "attendance": attendance_stats,
            "tasks_completed": tasks_stats
        }
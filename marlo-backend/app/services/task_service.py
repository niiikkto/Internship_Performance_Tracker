from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import List, Optional, Tuple

from app.models.task import (
    Task, TaskAssignment, KPITemplate, StudentKPIValue,
    StudentPerformance, TimelineEvent, TaskStatusEnum,
)
from app.models.user import User, RoleEnum
from app.schemas.task import (
    TaskUpdate, TaskAssignmentUpdate,
    KPITemplateUpdate, StudentRankingResponse,
)


class TaskService:
    """Сервис для управления задачами"""

    @staticmethod
    async def create_task(
        db: AsyncSession,
        title: str,
        description: Optional[str],
        due_date: datetime,
        creator_id: int,
    ) -> Task:
        task = Task(
            title=title,
            description=description,
            due_date=due_date,
            creator_id=creator_id,
            status=TaskStatusEnum.pending,
        )
        db.add(task)
        await db.flush()
        await db.refresh(task)
        return task

    @staticmethod
    async def get_task_by_id(db: AsyncSession, task_id: int) -> Optional[Task]:
        result = await db.execute(
            select(Task)
            .options(selectinload(Task.assignments))
            .where(Task.id == task_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_tasks(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: Optional[TaskStatusEnum] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Task], int]:
        query = select(Task)
        count_query = select(func.count(Task.id))

        if status:
            query = query.where(Task.status == status)
            count_query = count_query.where(Task.status == status)

        if search:
            pattern = f"%{search}%"
            cond = or_(Task.title.ilike(pattern), Task.description.ilike(pattern))
            query = query.where(cond)
            count_query = count_query.where(cond)

        total = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(desc(Task.created_at)).offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all()), total

    @staticmethod
    async def update_task(db: AsyncSession, task: Task, update_data: TaskUpdate) -> Task:
        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(task, key, value)
        await db.flush()
        await db.refresh(task)
        return task

    @staticmethod
    async def delete_task(db: AsyncSession, task: Task) -> None:
        await db.delete(task)

    @staticmethod
    async def check_and_update_overdue_status(db: AsyncSession) -> None:
        now = datetime.utcnow()
        result = await db.execute(
            select(Task).where(
                and_(
                    Task.status != TaskStatusEnum.done,
                    Task.status != TaskStatusEnum.overdue,
                    Task.due_date < now,
                )
            )
        )
        for task in result.scalars().all():
            task.status = TaskStatusEnum.overdue

        result = await db.execute(
            select(TaskAssignment).join(Task).where(
                and_(
                    TaskAssignment.status != TaskStatusEnum.done,
                    TaskAssignment.status != TaskStatusEnum.overdue,
                    Task.due_date < now,
                )
            )
        )
        for a in result.scalars().all():
            a.status = TaskStatusEnum.overdue


class TaskAssignmentService:
    """Сервис для управления назначениями задач"""

    @staticmethod
    async def assign_students(
        db: AsyncSession,
        task_id: int,
        student_ids: List[int],
        creator_id: int,
    ) -> List[TaskAssignment]:
        task = await TaskService.get_task_by_id(db, task_id)
        if not task:
            return []

        assignments: List[TaskAssignment] = []
        for student_id in student_ids:
            existing = await db.execute(
                select(TaskAssignment).where(
                    and_(
                        TaskAssignment.task_id == task_id,
                        TaskAssignment.student_id == student_id,
                    )
                )
            )
            if existing.scalar_one_or_none():
                continue

            assignment = TaskAssignment(
                task_id=task_id,
                student_id=student_id,
                status=TaskStatusEnum.pending,
            )
            db.add(assignment)
            assignments.append(assignment)

            await TimelineService.add_event(
                db, student_id,
                "task_assigned",
                f"Вам назначена задача: {task.title}",
                {"task_id": task_id, "task_title": task.title},
            )

        await db.flush()
        return assignments

    @staticmethod
    async def get_student_tasks(
        db: AsyncSession,
        student_id: int,
        status: Optional[TaskStatusEnum] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[TaskAssignment], int]:
        base = select(TaskAssignment).where(TaskAssignment.student_id == student_id)
        count_query = select(func.count(TaskAssignment.id)).where(TaskAssignment.student_id == student_id)

        if status:
            base = base.where(TaskAssignment.status == status)
            count_query = count_query.where(TaskAssignment.status == status)

        total = (await db.execute(count_query)).scalar() or 0

        query = (
            base
            .options(selectinload(TaskAssignment.task), selectinload(TaskAssignment.student))
            .order_by(desc(TaskAssignment.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.scalars().all()), total

    @staticmethod
    async def get_assignment_with_task(
        db: AsyncSession,
        assignment_id: int,
    ) -> Optional[TaskAssignment]:
        result = await db.execute(
            select(TaskAssignment)
            .options(selectinload(TaskAssignment.task))
            .where(TaskAssignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_assignment_status(
        db: AsyncSession,
        assignment: TaskAssignment,
        update_data: TaskAssignmentUpdate,
        student_id: int,
    ) -> TaskAssignment:
        if update_data.status:
            assignment.status = update_data.status
            if update_data.status == TaskStatusEnum.done:
                assignment.completed_at = datetime.utcnow()
                title = assignment.task.title if assignment.task else "задачу"
                await TimelineService.add_event(
                    db, student_id,
                    "task_completed",
                    f"Вы завершили задачу: {title}",
                    {"task_id": assignment.task_id, "assignment_id": assignment.id},
                )

        if update_data.feedback:
            assignment.feedback = update_data.feedback
            await TimelineService.add_event(
                db, student_id,
                "feedback_added",
                "На вашу задачу оставлена обратная связь",
                {"task_id": assignment.task_id, "assignment_id": assignment.id},
            )

        await db.flush()
        await db.refresh(assignment)
        return assignment


class KPIService:
    """Сервис для управления KPI"""

    @staticmethod
    async def create_kpi_template(
        db: AsyncSession,
        name: str,
        description: Optional[str],
        weight: float,
        max_value: float,
        created_by: int,
    ) -> KPITemplate:
        template = KPITemplate(
            name=name,
            description=description,
            weight=weight,
            max_value=max_value,
            created_by=created_by,
        )
        db.add(template)
        await db.flush()
        await db.refresh(template)
        return template

    @staticmethod
    async def get_all_kpi_templates(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[KPITemplate], int]:
        total = (await db.execute(select(func.count(KPITemplate.id)))).scalar() or 0
        result = await db.execute(
            select(KPITemplate)
            .order_by(desc(KPITemplate.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    @staticmethod
    async def update_kpi_template(
        db: AsyncSession,
        template: KPITemplate,
        update_data: KPITemplateUpdate,
    ) -> KPITemplate:
        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(template, key, value)
        await db.flush()
        await db.refresh(template)
        return template

    @staticmethod
    async def set_student_kpi_value(
        db: AsyncSession,
        student_id: int,
        template_id: int,
        value: float,
    ) -> StudentKPIValue:
        result = await db.execute(
            select(StudentKPIValue).where(
                and_(
                    StudentKPIValue.student_id == student_id,
                    StudentKPIValue.template_id == template_id,
                )
            )
        )
        kpi_value = result.scalar_one_or_none()

        if kpi_value:
            kpi_value.value = value
            kpi_value.updated_at = datetime.utcnow()
        else:
            kpi_value = StudentKPIValue(
                student_id=student_id,
                template_id=template_id,
                value=value,
            )
            db.add(kpi_value)

        await db.flush()
        await db.refresh(kpi_value)
        return kpi_value

    @staticmethod
    async def get_student_kpi_values(
        db: AsyncSession,
        student_id: int,
    ) -> List[StudentKPIValue]:
        result = await db.execute(
            select(StudentKPIValue)
            .options(selectinload(StudentKPIValue.template))
            .where(StudentKPIValue.student_id == student_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def calculate_performance_score(
        db: AsyncSession,
        student_id: int,
    ) -> float:
        kpi_values = await KPIService.get_student_kpi_values(db, student_id)
        if not kpi_values:
            return 0.0

        total_score = 0.0
        total_weight = 0.0
        for kv in kpi_values:
            template = kv.template
            if not template or template.max_value <= 0:
                continue
            normalized = (kv.value / template.max_value) * 100
            total_score += normalized * (template.weight / 100)
            total_weight += template.weight

        if total_weight == 0:
            return 0.0
        if total_weight <= 100:
            return total_score
        return (total_score / total_weight) * 100

    @staticmethod
    async def update_student_performance(
        db: AsyncSession,
        student_id: int,
    ) -> StudentPerformance:
        completed = (await db.execute(
            select(func.count(TaskAssignment.id)).where(
                and_(
                    TaskAssignment.student_id == student_id,
                    TaskAssignment.status == TaskStatusEnum.done,
                )
            )
        )).scalar() or 0

        on_time = (await db.execute(
            select(func.count(TaskAssignment.id))
            .join(Task)
            .where(
                and_(
                    TaskAssignment.student_id == student_id,
                    TaskAssignment.status == TaskStatusEnum.done,
                    TaskAssignment.completed_at <= Task.due_date,
                )
            )
        )).scalar() or 0

        total = (await db.execute(
            select(func.count(TaskAssignment.id)).where(
                TaskAssignment.student_id == student_id
            )
        )).scalar() or 0

        score = await KPIService.calculate_performance_score(db, student_id)

        result = await db.execute(
            select(StudentPerformance).where(StudentPerformance.student_id == student_id)
        )
        performance = result.scalar_one_or_none()

        if performance:
            performance.performance_score = score
            performance.tasks_completed = completed
            performance.tasks_on_time = on_time
            performance.tasks_total = total
            performance.updated_at = datetime.utcnow()
        else:
            performance = StudentPerformance(
                student_id=student_id,
                performance_score=score,
                tasks_completed=completed,
                tasks_on_time=on_time,
                tasks_total=total,
            )
            db.add(performance)

        await db.flush()
        await db.refresh(performance)
        return performance

    @staticmethod
    async def get_students_ranking(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[StudentRankingResponse], int]:
        result = await db.execute(
            select(User, StudentPerformance)
            .outerjoin(StudentPerformance, User.id == StudentPerformance.student_id)
            .where(User.role == RoleEnum.student)
            .order_by(desc(StudentPerformance.performance_score).nullslast())
        )
        rows = result.all()
        total = len(rows)

        ranking: List[StudentRankingResponse] = []
        for idx, (user, perf) in enumerate(rows[skip:skip + limit], start=skip + 1):
            ranking.append(StudentRankingResponse(
                student_id=user.id,
                full_name=user.full_name,
                email=user.email,
                performance_score=perf.performance_score if perf else 0.0,
                rank=idx,
                tasks_completed=perf.tasks_completed if perf else 0,
                tasks_on_time=perf.tasks_on_time if perf else 0,
                tasks_total=perf.tasks_total if perf else 0,
            ))
        return ranking, total


class TimelineService:
    """Сервис для работы с Timeline"""

    @staticmethod
    async def add_event(
        db: AsyncSession,
        user_id: int,
        event_type: str,
        description: Optional[str] = None,
        event_meta: Optional[dict] = None,
    ) -> TimelineEvent:
        event = TimelineEvent(
            user_id=user_id,
            event_type=event_type,
            description=description,
            event_meta=event_meta or {},
        )
        db.add(event)
        await db.flush()
        return event

    @staticmethod
    async def get_user_timeline(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[TimelineEvent], int]:
        total = (await db.execute(
            select(func.count(TimelineEvent.id)).where(TimelineEvent.user_id == user_id)
        )).scalar() or 0

        result = await db.execute(
            select(TimelineEvent)
            .where(TimelineEvent.user_id == user_id)
            .order_by(desc(TimelineEvent.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

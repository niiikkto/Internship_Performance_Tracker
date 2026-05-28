from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.core.dependencies import get_current_user, require_manager, require_admin
from app.models.user import User, RoleEnum
from app.models.task import KPITemplate, TaskStatusEnum
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskDetailResponse,
    TaskAssignmentCreate, TaskAssignmentUpdate, TaskAssignmentResponse,
    TaskAssignmentDetailResponse,
    KPITemplateCreate, KPITemplateUpdate, KPITemplateResponse,
    StudentKPIValueCreate, StudentKPIValueResponse, StudentKPIDetailResponse,
    TimelineEventResponse,
)
from app.services.task_service import (
    TaskService, TaskAssignmentService, KPIService, TimelineService,
)

router = APIRouter(tags=["tasks"])


# ==================== STATIC SUB-PATHS — ОБЯЗАТЕЛЬНО раньше {task_id} ====================

@router.get("/tasks/my-tasks", response_model=dict)
async def get_my_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    task_status: Optional[TaskStatusEnum] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Этот endpoint только для студентов")

    assignments, total = await TaskAssignmentService.get_student_tasks(
        db, current_user.id, task_status, skip, limit
    )
    return {
        "items": [TaskAssignmentDetailResponse.model_validate(a) for a in assignments],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/tasks/check-overdue")
async def check_and_update_overdue(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await TaskService.check_and_update_overdue_status(db)
    await db.commit()
    return {"message": "Статусы обновлены"}


# ==================== TASKS ====================

@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    task = await TaskService.create_task(
        db=db,
        title=task_data.title,
        description=task_data.description,
        due_date=task_data.due_date,
        creator_id=current_user.id,
    )
    await db.commit()
    await db.refresh(task)
    await TimelineService.add_event(
        db, current_user.id,
        "task_created",
        f"Вы создали задачу: {task.title}",
        {"task_id": task.id},
    )
    await db.commit()
    return task


@router.get("/tasks", response_model=dict)
async def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    task_status: Optional[TaskStatusEnum] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == RoleEnum.student:
        assignments, total = await TaskAssignmentService.get_student_tasks(
            db, current_user.id, task_status, skip, limit
        )
        return {
            "items": [TaskAssignmentDetailResponse.model_validate(a) for a in assignments],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    tasks, total = await TaskService.get_all_tasks(db, skip, limit, task_status, search)
    return {
        "items": [TaskResponse.model_validate(t) for t in tasks],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await TaskService.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if current_user.role == RoleEnum.student:
        if not any(a.student_id == current_user.id for a in task.assignments):
            raise HTTPException(status_code=403, detail="Доступ запрещён")
    return task


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    task = await TaskService.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if task.creator_id != current_user.id and current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    task = await TaskService.update_task(db, task, task_data)
    await db.commit()
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    task = await TaskService.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if task.creator_id != current_user.id and current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    await TaskService.delete_task(db, task)
    await db.commit()


# ==================== TASK ASSIGNMENTS ====================

@router.post("/tasks/{task_id}/assign")
async def assign_task_to_students(
    task_id: int,
    assignment_data: TaskAssignmentCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    task = await TaskService.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    assignments = await TaskAssignmentService.assign_students(
        db, task_id, assignment_data.student_ids, current_user.id
    )
    await db.commit()

    return {
        "message": f"Задача назначена {len(assignments)} студентам",
        "assignments": [TaskAssignmentResponse.model_validate(a) for a in assignments],
    }


@router.put("/tasks/{task_id}/assignments/{assignment_id}", response_model=TaskAssignmentResponse)
async def update_task_assignment_status(
    task_id: int,
    assignment_id: int,
    update_data: TaskAssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignment = await TaskAssignmentService.get_assignment_with_task(db, assignment_id)
    if not assignment or assignment.task_id != task_id:
        raise HTTPException(status_code=404, detail="Назначение не найдено")

    if current_user.role == RoleEnum.student and assignment.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    assignment = await TaskAssignmentService.update_assignment_status(
        db, assignment, update_data, assignment.student_id
    )
    await db.commit()
    return assignment


# ==================== KPI TEMPLATES ====================

@router.post("/kpi/templates", response_model=KPITemplateResponse)
async def create_kpi_template(
    template_data: KPITemplateCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    template = await KPIService.create_kpi_template(
        db=db,
        name=template_data.name,
        description=template_data.description,
        weight=template_data.weight,
        max_value=template_data.max_value,
        created_by=current_user.id,
    )
    await db.commit()
    return template


@router.get("/kpi/templates", response_model=dict)
async def list_kpi_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    templates, total = await KPIService.get_all_kpi_templates(db, skip, limit)
    return {
        "items": [KPITemplateResponse.model_validate(t) for t in templates],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.put("/kpi/templates/{template_id}", response_model=KPITemplateResponse)
async def update_kpi_template(
    template_id: int,
    update_data: KPITemplateUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KPITemplate).where(KPITemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")

    template = await KPIService.update_kpi_template(db, template, update_data)
    await db.commit()
    return template


# ==================== STUDENT KPI VALUES ====================

@router.post("/kpi/values", response_model=StudentKPIValueResponse)
async def set_student_kpi_value(
    kpi_data: StudentKPIValueCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    kpi_value = await KPIService.set_student_kpi_value(
        db, kpi_data.student_id, kpi_data.template_id, kpi_data.value
    )
    await db.commit()

    await KPIService.update_student_performance(db, kpi_data.student_id)
    await db.commit()

    await TimelineService.add_event(
        db, kpi_data.student_id,
        "kpi_updated",
        "Ваш KPI был обновлён",
        {"kpi_template_id": kpi_data.template_id},
    )
    await db.commit()
    return kpi_value


@router.get("/kpi/my-kpi", response_model=dict)
async def get_my_kpi(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kpi_values = await KPIService.get_student_kpi_values(db, current_user.id)
    score = await KPIService.calculate_performance_score(db, current_user.id)
    return {
        "student_id": current_user.id,
        "performance_score": score,
        "kpi_values": [StudentKPIDetailResponse.model_validate(v) for v in kpi_values],
    }


@router.get("/kpi/student/{student_id}", response_model=dict)
async def get_student_kpi(
    student_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    kpi_values = await KPIService.get_student_kpi_values(db, student_id)
    score = await KPIService.calculate_performance_score(db, student_id)
    return {
        "student_id": student_id,
        "performance_score": score,
        "kpi_values": [StudentKPIDetailResponse.model_validate(v) for v in kpi_values],
    }


# ==================== PERFORMANCE & RANKING ====================

@router.get("/rankings", response_model=dict)
async def get_student_rankings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    ranking, total = await KPIService.get_students_ranking(db, skip, limit)
    return {
        "items": [r.model_dump() for r in ranking],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/performance/update/{student_id}")
async def recalculate_student_performance(
    student_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    performance = await KPIService.update_student_performance(db, student_id)
    await db.commit()
    return {
        "student_id": performance.student_id,
        "performance_score": performance.performance_score,
        "tasks_completed": performance.tasks_completed,
        "tasks_on_time": performance.tasks_on_time,
        "tasks_total": performance.tasks_total,
    }


# ==================== TIMELINE ====================

@router.get("/timeline", response_model=dict)
async def get_my_timeline(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    events, total = await TimelineService.get_user_timeline(db, current_user.id, skip, limit)
    return {
        "items": [TimelineEventResponse.model_validate(e) for e in events],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/timeline/{user_id}", response_model=dict)
async def get_user_timeline(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    events, total = await TimelineService.get_user_timeline(db, user_id, skip, limit)
    return {
        "items": [TimelineEventResponse.model_validate(e) for e in events],
        "total": total,
        "skip": skip,
        "limit": limit,
    }

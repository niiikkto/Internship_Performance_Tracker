import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, RoleEnum
from app.models.submission import ReportSubmission
from app.schemas.submission import SubmissionResponse
from app.services.task_service import TimelineService

router = APIRouter(prefix="/api/v1", tags=["submissions"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".zip", ".png", ".jpg", ".jpeg"}


@router.post("/submissions/upload", response_model=SubmissionResponse)
async def upload_report(
    file: UploadFile = File(...),
    description: str | None = Form(None),
    task_id: int | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Загрузить отчёт или файл (студент)"""
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Только студенты могут загружать отчёты")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Имя файла обязательно")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый тип файла. Разрешены: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 10 МБ)")

    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / stored_name
    file_path.write_bytes(content)

    submission = ReportSubmission(
        student_id=current_user.id,
        original_filename=file.filename,
        stored_filename=stored_name,
        file_path=str(file_path),
        content_type=file.content_type,
        file_size=len(content),
        description=description,
        task_id=task_id,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    await TimelineService.add_event(
        db,
        current_user.id,
        "report_uploaded",
        f"Загружен отчёт: {file.filename}",
        {"submission_id": submission.id, "filename": file.filename},
    )
    await db.commit()

    return submission


@router.get("/submissions/my", response_model=dict)
async def list_my_submissions(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список загруженных отчётов студента"""
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Только для студентов")

    query = (
        select(ReportSubmission)
        .where(ReportSubmission.student_id == current_user.id)
        .order_by(desc(ReportSubmission.created_at))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    count_result = await db.execute(
        select(ReportSubmission).where(ReportSubmission.student_id == current_user.id)
    )
    total = len(count_result.scalars().all())

    return {
        "items": [SubmissionResponse.model_validate(s) for s in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }

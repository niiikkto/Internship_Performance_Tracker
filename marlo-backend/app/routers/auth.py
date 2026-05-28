from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    RefreshRequest,
    PasswordChange,
    RoleUpdate,
)
from app.services.auth_service import (
    register_user,
    login_user,
    get_all_users,
    get_students,
    deactivate_user,
    activate_user,
    change_user_role,
    change_password,
    refresh_tokens,
)
from app.core.dependencies import get_current_user, require_admin, require_manager
from app.models.user import User
from typing import List

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await register_user(db, user_data)

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    return await login_user(db, user_data.email, user_data.password)

@router.post("/refresh", response_model=Token)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await refresh_tokens(db, data.refresh_token)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/me/password")
async def change_my_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await change_password(db, current_user, data.old_password, data.new_password)

@router.get("/students", response_model=List[UserResponse])
async def list_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Список студентов для назначения задач и оценок (менеджер/админ)."""
    return await get_students(db)


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await get_all_users(db)

@router.patch("/users/{user_id}/deactivate")
async def deactivate(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await deactivate_user(db, user_id)

@router.patch("/users/{user_id}/activate")
async def activate(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await activate_user(db, user_id)

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_role(
    user_id: int,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await change_user_role(db, user_id, data.role)

# Auth Service

Сервис аутентификации и управления пользователями на FastAPI + PostgreSQL.

## Возможности

- Регистрация и логин с JWT (access + refresh)
- Ротация refresh-токенов (новая пара выдаётся при `/auth/refresh`)
- Хэширование паролей через bcrypt
- Ролевая модель: `admin`, `manager`, `student`
- Защищённые эндпоинты с проверкой роли
- Смена пароля
- Управление пользователями (активация / деактивация / смена роли) — только для админа

## Стек

- **FastAPI** — веб-фреймворк
- **SQLAlchemy 2.0 (async)** + **asyncpg** — ORM и драйвер PostgreSQL
- **Alembic** — миграции
- **python-jose** — JWT
- **passlib[bcrypt]** — хэширование паролей
- **Pydantic v2** — валидация

## Структура

```
app/
├── core/
│   ├── security.py        # JWT + bcrypt
│   └── dependencies.py    # get_current_user, require_admin/manager
├── models/user.py         # SQLAlchemy User + RoleEnum
├── schemas/user.py        # Pydantic схемы
├── services/auth_service.py
├── routers/auth.py
├── database.py
└── main.py
```

## Установка

```bash
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # Linux/Mac
pip install -r requirements.txt
cp .env.example .env             # и заполни значения
```

## Запуск

```bash
uvicorn app.main:app --reload
```

Swagger UI: <http://localhost:8000/docs>

## Эндпоинты

### Публичные

| Метод | Путь             | Описание                          |
|-------|------------------|-----------------------------------|
| POST  | `/auth/register` | Регистрация нового пользователя   |
| POST  | `/auth/login`    | Логин, возвращает access+refresh  |
| POST  | `/auth/refresh`  | Обновление пары токенов           |

### Требуют авторизации

| Метод | Путь                | Описание                |
|-------|---------------------|-------------------------|
| GET   | `/auth/me`          | Профиль текущего юзера  |
| POST  | `/auth/me/password` | Смена своего пароля     |

### Только админ

| Метод  | Путь                                | Описание                |
|--------|-------------------------------------|-------------------------|
| GET    | `/auth/users`                       | Список пользователей    |
| PATCH  | `/auth/users/{user_id}/deactivate`  | Деактивировать          |
| PATCH  | `/auth/users/{user_id}/activate`    | Активировать            |
| PATCH  | `/auth/users/{user_id}/role`        | Сменить роль            |

## Примеры запросов

**Регистрация:**
```json
POST /auth/register
{
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "password": "SuperSecret123",
  "role": "student"
}
```

**Логин:**
```json
POST /auth/login
{
  "email": "ivan@example.com",
  "password": "SuperSecret123"
}
```

Ответ:
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

**Использование access-токена:**
```
Authorization: Bearer <access_token>
```

**Обновление токенов:**
```json
POST /auth/refresh
{
  "refresh_token": "eyJhbGciOi..."
}
```

**Смена пароля:**
```json
POST /auth/me/password
Authorization: Bearer <access_token>
{
  "old_password": "SuperSecret123",
  "new_password": "EvenBetter456"
}
```

## Безопасность — что стоит докрутить дальше

- [ ] Чёрный список / версионирование refresh-токенов в БД (сейчас при ротации старый не инвалидируется)
- [ ] Rate limiting на `/login` и `/register`
- [ ] Email-верификация
- [ ] Сброс пароля по email
- [ ] Логирование событий аутентификации
- [ ] CORS-настройки под фронт
- [ ] Заменить `datetime.utcnow()` на `datetime.now(timezone.utc)` (deprecated в Python 3.12+)

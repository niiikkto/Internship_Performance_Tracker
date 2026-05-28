# Marlo Internship Performance Tracker

Внутренняя корпоративная web-платформа для оценки эффективности студентов-практикантов компании Marlogroup.

## Возможности

- 🔐 JWT-аутентификация (access + refresh), 3 роли: **admin / manager / student**
- 📋 Управление задачами и назначениями
- 📊 KPI: шаблоны, значения по студентам, взвешенный Performance Score
- 📅 Учёт посещаемости (attendance)
- 💬 Feedback от наставника
- 📈 Дашборд: средний performance, attendance rate, активные/просроченные задачи, top performers
- 🗂 Загрузка отчётов (multipart)
- 🕒 Timeline активности студента
- 📤 Экспорт отчёта по студенту (JSON / CSV)
- 🏆 Рейтинг студентов (rankings)


## Стек

| Слой     | Технологии                                                               |
| -------- | ------------------------------------------------------------------------ |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, lucide-react |
| Backend  | FastAPI, SQLAlchemy 2 (async), Pydantic v2, JWT (python-jose), bcrypt    |
| База     | SQLite (dev) — легко поменять на Postgres через `DATABASE_URL`           |


## Структура

```
.
├── marlo-backend/          ← FastAPI бэкенд (единственный)
│   ├── app/
│   │   ├── core/           dependencies (get_current_user, require_admin, require_manager), security (jwt, bcrypt)
│   │   ├── models/         SQLAlchemy ORM (user, task, attendance, feedback, submission)
│   │   ├── schemas/        Pydantic схемы (user, task, analytics, submission)
│   │   ├── routers/        auth / tasks+kpi+rankings+timeline / analytics+dashboard+reports / submissions
│   │   ├── services/       бизнес-логика (auth_service, task_service, analytics_service)
│   │   ├── database.py
│   │   └── main.py
│   ├── uploads/            файлы студентов
│   ├── requirements.txt
│   └── .env.example
│
└── marlo-student-portal/   ← Next.js фронт (портал студента)
    ├── src/
    │   ├── app/(auth)/     login, register
    │   ├── app/(student)/  dashboard, tasks, grades, timeline, uploads, profile
    │   ├── components/
    │   │   ├── auth/       AuthGuard
    │   │   ├── layout/     StudentShell
    │   │   └── ui/         Button, Card, Input, Badge, Spinner, EmptyState
    │   └── lib/            api клиент, auth, types, utils
    ├── package.json
    └── tailwind.config.ts
```

> **Примечание:** папка `auth-service` (если присутствует в клоне) — устаревший дубль, не используется.


## Запуск (Windows / PowerShell)

### Backend

```powershell
cd marlo-backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env       # подставьте свой SECRET_KEY
# При первом запуске или после смены схемы БД:
Remove-Item .\marlo_db.db -ErrorAction SilentlyContinue
uvicorn app.main:app --reload --port 8000
```

Swagger: <http://localhost:8000/docs>

### Frontend

```bash
cd marlo-student-portal
npm install
npm run dev
```

<http://localhost:3000>

### Первичная настройка

1. В Swagger `POST /auth/register` создать админа (`"role": "admin"`).
2. Создать менеджера тем же способом (`"role": "manager"`).
3. Студент регистрируется самостоятельно на `/register` в фронте.
4. Менеджер создаёт KPI-шаблоны, задачи, выставляет оценки → данные подтягиваются в дашборд студента.


## Роли и доступ

| Endpoint                          | admin | manager | student              |
| --------------------------------- | ----- | ------- | -------------------- |
| `POST /auth/register`             | ✅     | ✅       | ✅ (создаёт студента) |
| `GET /auth/users`                 | ✅     | ❌       | ❌                    |
| `POST /api/v1/tasks`              | ✅     | ✅       | ❌                    |
| `POST /api/v1/tasks/{id}/assign`  | ✅     | ✅       | ❌                    |
| `GET /api/v1/tasks/my-tasks`      | ❌     | ❌       | ✅                    |
| `POST /api/v1/kpi/templates`      | ✅     | ❌       | ❌                    |
| `POST /api/v1/kpi/values`         | ✅     | ✅       | ❌                    |
| `GET /api/v1/kpi/my-kpi`          | ❌     | ❌       | ✅                    |
| `GET /api/v1/rankings`            | ✅     | ✅       | ❌                    |
| `GET /api/v1/timeline/{id}`       | ✅     | ✅       | ✅ (только свой)      |
| `POST /api/v1/attendance`         | ✅     | ✅       | ❌                    |
| `POST /api/v1/feedback`           | ✅     | ✅       | ❌                    |
| `GET /api/v1/dashboard/stats`     | ✅     | ✅       | ❌                    |
| `GET /api/v1/reports/{id}`        | ✅     | ✅       | ❌                    |
| `POST /api/v1/submissions/upload` | ❌     | ❌       | ✅                    |


## Тестирование

Бэкенд покрыт smoke-тестом (`marlo-backend/_smoketest.ps1`, не коммитится) — 32 кейса:
регистрация всех ролей, RBAC, кросс-роль сценарии, route-order regression, multipart upload, refresh-токены.

## Команда

Проект сделан в рамках производственной практики студентов-разработчиков Marlogroup.
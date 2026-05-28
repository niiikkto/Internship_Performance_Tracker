# Marlo Internship Performance Tracker — единый проект

Объединили `auth-service` + `marlo-backend` → единый бэкенд `marlo-backend`
(весь функционал auth уже есть в нём; `auth-service` — устаревший дубль, не запускаем).
Фронтенд один: `marlo-student-portal` (Next.js).

## Финальная структура

```
goddonthelp/
├── marlo-backend/                  ← FastAPI бэкенд (единственный)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 ← регистрирует ВСЕ роутеры
│   │   ├── database.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py     (get_current_user, require_admin, require_manager)
│   │   │   └── security.py         (jwt, bcrypt)
│   │   ├── models/
│   │   │   ├── __init__.py         ← импортирует все модели для Base.metadata
│   │   │   ├── user.py             (с relationship timeline ← починили)
│   │   │   ├── task.py             (Task, TaskAssignment, KPITemplate, ...)
│   │   │   ├── attendance.py
│   │   │   ├── feedback.py
│   │   │   └── submission.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── task.py
│   │   │   ├── analytics.py
│   │   │   └── submission.py
│   │   ├── routers/
│   │   │   ├── auth.py             /auth/...
│   │   │   ├── tasks.py            /api/v1/tasks, /kpi, /rankings, /timeline
│   │   │   ├── analytics.py        /api/v1/attendance, /feedback, /dashboard, /reports
│   │   │   └── submissions.py      /api/v1/submissions
│   │   └── services/
│   │       ├── auth_service.py
│   │       ├── task_service.py
│   │       └── analytics_service.py
│   ├── uploads/                    ← файлы студентов
│   ├── requirements.txt
│   └── .env
│
├── marlo-student-portal/           ← Next.js 15 / React 19 фронт
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── (auth)/login/page.tsx
│   │   │   ├── (auth)/register/page.tsx
│   │   │   └── (student)/
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── tasks/page.tsx
│   │   │       ├── grades/page.tsx
│   │   │       ├── timeline/page.tsx
│   │   │       ├── uploads/page.tsx
│   │   │       └── profile/page.tsx
│   │   ├── components/
│   │   │   ├── auth/AuthGuard.tsx
│   │   │   ├── layout/StudentShell.tsx
│   │   │   └── ui/ (Button, Card, Input, Badge, Spinner, EmptyState)
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── auth.ts
│   │       ├── types.ts
│   │       └── utils.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── auth-service/                   ← УДАЛИТЬ (устаревший дубль auth-части)
```

## Запуск

### 1) Бэкенд
```powershell
cd marlo-backend
# первый раз создаём venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# чистим старую БД, если она была собрана со сломанной моделью User
Remove-Item .\marlo.db -ErrorAction SilentlyContinue
uvicorn app.main:app --reload --port 8000
```
Swagger: http://localhost:8000/docs

### 2) Фронт
```powershell
cd marlo-student-portal
npm install
npm run dev
```
http://localhost:3000

### 3) Первый аккаунт
Через Swagger `POST /auth/register` создать админа (role=admin), затем менеджера (role=manager),
а студент регистрируется сам через `/register` на фронте.

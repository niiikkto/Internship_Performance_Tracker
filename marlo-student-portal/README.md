# Marlo Student Portal (Next.js)

Студенческий портал для проекта Marlo: дашборд, задачи с фильтрами, timeline, KPI/оценки, загрузка отчётов и профиль.

## Страницы

| Путь | Описание |
|------|----------|
| `/dashboard` | Дашборд студента |
| `/tasks` | Мои задачи + фильтр по статусу |
| `/timeline` | Лента активности |
| `/grades` | KPI и обратная связь |
| `/uploads` | Загрузка отчётов / файлов |
| `/profile` | Профиль и смена пароля |
| `/login`, `/register` | Авторизация |

## Запуск

### 1. Backend (`marlo-backend`)

```bash
cd marlo-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: http://localhost:8000/docs

### 2. Frontend

```bash
cd marlo-student-portal
cp .env.local.example .env.local
npm install
npm run dev
```

Портал: http://localhost:3000

## Переменные окружения

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Стек

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- lucide-react

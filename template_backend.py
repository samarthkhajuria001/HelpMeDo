#!/usr/bin/env python3
from pathlib import Path

BASE = Path(__file__).parent

FILES = [
    "backend/app/__init__.py",
    "backend/app/main.py",
    "backend/app/config.py",
    "backend/app/database.py",
    "backend/app/models/__init__.py",
    "backend/app/models/user.py",
    "backend/app/models/goal.py",
    "backend/app/models/task.py",
    "backend/app/models/subtask.py",
    "backend/app/schemas/__init__.py",
    "backend/app/schemas/user.py",
    "backend/app/schemas/goal.py",
    "backend/app/schemas/task.py",
    "backend/app/schemas/auth.py",
    "backend/app/routers/__init__.py",
    "backend/app/routers/auth.py",
    "backend/app/routers/tasks.py",
    "backend/app/routers/goals.py",
    "backend/app/routers/ai.py",
    "backend/app/services/__init__.py",
    "backend/app/services/auth.py",
    "backend/app/services/ai.py",
    "backend/app/utils/__init__.py",
    "backend/app/utils/dependencies.py",
    "backend/alembic/env.py",
    "backend/alembic/versions/.gitkeep",
    "backend/tests/__init__.py",
    "backend/tests/conftest.py",
    "backend/tests/test_tasks.py",
    "backend/tests/test_goals.py",
    "backend/alembic.ini",
    "backend/requirements.txt",
    "backend/requirements-dev.txt",
    "backend/Dockerfile",
    "backend/.env.example",
    "backend/.gitignore",
    "backend/pytest.ini",
    ".github/workflows/backend-ci.yml",
    ".github/workflows/deploy.yml",
    "docker-compose.yml",
]

for f in FILES:
    path = BASE / f
    path.parent.mkdir(parents=True, exist_ok=True)
    path.touch()

print(f"Created {len(FILES)} files")

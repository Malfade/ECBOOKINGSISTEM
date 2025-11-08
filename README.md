# QRBOOKS — система бронирования кабинетов

Full-stack приложение для управления бронированием кабинетов колледжа с поддержкой QR-кодов, ролей пользователей и административной панели.

## Возможности

- Авторизация пользователей (студент, преподаватель, администратор) через JWT в httpOnly cookies
- Публичная регистрация студентов и преподавателей + создание администраторов из панели
- Просмотр списка кабинетов, статуса занятости и свободных окон в течение 24 часов
- Бронирование кабинетов через мобильный сканер QR или веб-интерфейс
- Управление кабинетами и расписанием со стороны администратора (создание/блокировка, ручные брони)
- Создание новых пользователей (студент/преподаватель/админ) через веб-интерфейс администратора
- Генерация и хранение QR-кодов для каждого кабинета (`/static/qr/<id>.png`)
- Журнал действий (создание/отмена брони, обновление кабинета, вход/выход)
- Раздел статистики для администратора (сводки по кабинетам, броням и пользователям)

## Стек

- **Backend:** Python 3.12, Flask, SQLAlchemy, Alembic, Flask-JWT-Extended
- **Frontend:** React + TypeScript (Vite)
- **БД:** PostgreSQL (SQLite по умолчанию)
- **Инфраструктура:** npm scripts, Alembic миграции, seed-скрипт

## Быстрый старт (без Docker)

### 1. Системные зависимости
```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip postgresql nodejs npm
```

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

#### Настройка БД PostgreSQL (пример)
```sql
CREATE USER appuser WITH PASSWORD 'secret123';
CREATE DATABASE rooms OWNER appuser;
```
В `.env` задайте `DATABASE_URL=postgresql+psycopg2://appuser:secret123@localhost/rooms`.

#### Миграции и сиды
```bash
flask --app app db upgrade
python seed.py
```

#### Запуск сервера
```bash
flask --app app run --host=0.0.0.0 --port=5000
```

### 3. Frontend
```bash
cd ../frontend
cp .env.example .env
# Требуется Node.js >= 18 (рекомендуется 20 LTS)
npm install
npm run dev
```
Приложение будет доступно на `http://localhost:5173`.

## Структура проекта

```
backend/
  app/
    routes/          # Контроллеры Flask
    services/        # Бизнес-логика (валидации, проверки пересечений)
    utils/           # Утилиты (генерация QR)
    models.py        # SQLAlchemy модели и enum
    security.py      # JWT/cookies, декораторы ролей
  migrations/        # Alembic миграции
  seed.py            # Первичное заполнение данными
frontend/
  src/
    api/             # Клиент для REST API
    pages/           # Страницы (кабинеты, админка, дашборд)
    components/      # UI-компоненты
README.md
```

## Тестовые учётные записи (из сидов)

| Роль       | Логин   | Пароль       |
|------------|---------|--------------|
| admin      | admin   | admin1234    |
| teacher    | teacher | teacher1234  |
| student    | student | student1234  |

## TODO / дальнейшие шаги

- Подключить отправку уведомлений за 10 минут до начала брони (push/e-mail)
- Настроить интеграцию с расписанием колледжа (импорт .ics)
- Покрыть критичные сервисы тестами (PyTest + React Testing Library)

## Полезные команды

```bash
# Backend
flask --app app db migrate -m "Message"   # новая миграция
flask --app app db upgrade                 # применить миграции
python seed.py                             # заполнение начальными данными

# Frontend
npm run lint
npm run build
```

## Безопасность

- Пароли хранятся в bcrypt, сессии — JWT access/refresh в httpOnly cookies
- Каждая роль проверяется через декоратор `role_required`
- Настроен Flask-Limiter с индивидуальными лимитами для входа, бронирований и админских действий
- Используются параметризованные запросы ORM для защиты от SQL-инъекций
- Подготовлены места для CSRF и XSS mitigation (TODO-комментарии)
# QRBOOK

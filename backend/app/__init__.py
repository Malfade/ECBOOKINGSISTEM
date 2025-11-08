from __future__ import annotations

import logging

from flask import Flask
from flask_cors import CORS
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from pathlib import Path

from .config import Config
from .extensions import bcrypt, db, jwt, limiter, migrate
from .security import register_security


# Контроллер только получает запрос,
# вся логика должна быть вынесена в services/reservations.py

def create_app(config_class: type[Config] | None = None) -> Flask:
    """Application factory."""
    app = Flask(__name__, static_folder="static")
    app.config.from_object(config_class or Config())

    _ensure_database_connection(app)
    register_extensions(app)
    Config.init_app(app)
    register_security(app)
    register_blueprints(app)
    configure_logging(app)

    CORS(
        app,
        resources={r"/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
        supports_credentials=True,
        allow_headers=app.config.get("CORS_HEADERS", "Content-Type"),
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    )

    return app


def _ensure_database_connection(app: Flask) -> None:
    """Пробуем подключиться к БД и откатываемся на SQLite, если доступ отсутствует."""
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", Config.DEFAULT_SQLITE_URI)
    if uri.startswith("sqlite"):
        _ensure_sqlite_file(uri)
        return

    engine = None
    try:
        engine = create_engine(uri, pool_pre_ping=True)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError as exc:
        fallback = Config.DEFAULT_SQLITE_URI
        app.logger.warning(
            "Не удалось подключиться к БД %s (%s). Используем SQLite по умолчанию: %s",
            uri,
            exc.orig if hasattr(exc, "orig") else exc,
            fallback,
        )
        app.config["SQLALCHEMY_DATABASE_URI"] = fallback
        _ensure_sqlite_file(fallback)
    finally:
        if engine is not None:
            try:
                engine.dispose()
            except Exception:  # noqa: BLE001
                pass


def _ensure_sqlite_file(uri: str) -> None:
    if not uri.startswith("sqlite:///"):
        return
    db_path = uri.split("sqlite:///")[-1]
    path = Path(db_path) if db_path.startswith("/") else Config.BASE_DIR / db_path
    path.parent.mkdir(parents=True, exist_ok=True)


def register_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)


def register_blueprints(app: Flask) -> None:
    # TODO: подключить auth, rooms и admin blueprints
    from .routes import admin, auth, reservations, rooms

    app.register_blueprint(auth.bp)
    app.register_blueprint(rooms.bp)
    app.register_blueprint(reservations.bp)
    app.register_blueprint(admin.bp)


# TODO: добавить уведомление пользователям за 10 минут до брони

def configure_logging(app: Flask) -> None:
    if not app.debug:
        app.logger.setLevel(logging.INFO)

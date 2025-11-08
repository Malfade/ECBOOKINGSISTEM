import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { user } = useAuth();

  return (
    <section className="page home-page">
      <div className="hero">
        <div className="hero-text">
          <span className="hero-kicker">Твой кампус, без очередей</span>
          <h1>QRBOOKS</h1>
          <p>
            Единая система быстрого бронирования кабинетов колледжа. Проверяйте занятость,
            сканируйте QR-коды на дверях и управляйте расписанием в пару кликов.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat__value">24/7</span>
              <span className="hero-stat__label">Доступ к расписанию</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__value">3 сек</span>
              <span className="hero-stat__label">на бронирование по QR</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat__value">0</span>
              <span className="hero-stat__label">очередей у кабинетов</span>
            </div>
          </div>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/rooms">Перейти к кабинетам</Link>
            {user ? (
              <Link className="btn btn-secondary" to="/dashboard">Мои брони</Link>
            ) : (
              <>
                <Link className="btn btn-secondary" to="/login">Войти</Link>
                <Link className="btn btn-tertiary" to="/register">Зарегистрироваться</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image" aria-hidden>
          <div className="hero-card">
            <span className="hero-room">B101</span>
            <span className="hero-status">свободен</span>
            <p>Сканируйте QR на двери и бронируйте за 3 секунды.</p>
          </div>
        </div>
      </div>
      <div className="features-grid">
        <article className="feature-card">
          <span className="feature-icon" aria-hidden>📅</span>
          <h3>Прозрачное расписание</h3>
          <p>Свободные окна и ближайшие занятия всегда под рукой на телефоне или ПК.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon" aria-hidden>🛡</span>
          <h3>Роли и доступы</h3>
          <p>Студенты, преподаватели и администраторы работают в единой системе c разграничением прав.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon" aria-hidden>⚡</span>
          <h3>QR-коды на дверях</h3>
          <p>Каждый кабинет получает уникальный QR, который ведёт прямо на его страницу.</p>
        </article>
      </div>
    </section>
  );
}

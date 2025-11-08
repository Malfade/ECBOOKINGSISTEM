import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');
  const roleLabel: Record<string, string> = {
    student: 'Студент',
    teacher: 'Преподаватель',
    admin: 'Админ',
  };
  const year = new Date().getFullYear();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo">QRBOOKS</Link>
          <span className="logo-tagline">smart campus booking</span>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={linkClass}>Главная</NavLink>
          <NavLink to="/rooms" className={linkClass}>Кабинеты</NavLink>
          {user && <NavLink to="/dashboard" className={linkClass}>Мои брони</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" className={linkClass}>Админка</NavLink>}
        </nav>
        <div className="auth-block">
          {user ? (
            <>
              <span className="user-chip">
                <span>{user.name}</span>
                <span className="user-chip__role">{roleLabel[user.role] ?? user.role}</span>
              </span>
              <button type="button" className="btn btn-outline" onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn-link">Войти</NavLink>
              <NavLink to="/register" className="btn btn-primary">Регистрация</NavLink>
            </>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>© {year} QRBOOKS · Быстрое бронирование аудиторий</span>
        <span>
          <Link to="/rooms">Список кабинетов</Link>
          {' · '}
          <a href="mailto:support@qrbooks.local">support@qrbooks.local</a>
        </span>
      </footer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup, ApiHttpError } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const allowedRoles: UserRole[] = ['student', 'teacher'];

export function RegisterPage() {
  const { refresh, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('Введите имя и пароль');
      return;
    }
    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await signup({ name, password, role });
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiHttpError) {
        setError(err.payload?.msg ?? err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось зарегистрироваться');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page auth-page">
      <h1>Регистрация</h1>
      <p className="page-subtitle">Создайте аккаунт студента или преподавателя. Администраторы создаются через панель админа.</p>
      <ErrorBanner message={error ?? ''} />
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Имя пользователя
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Пароль
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
        </label>
        <label>
          Роль
          <select value={role} onChange={e => setRole(e.target.value as UserRole)}>
            {allowedRoles.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner variant="inline" /> : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="auth-link">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </section>
  );
}

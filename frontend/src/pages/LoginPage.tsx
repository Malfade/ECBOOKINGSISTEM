import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';

export function LoginPage() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await login(name, password);
      navigate('/rooms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page login-page">
      <h1>Вход</h1>
      <p className="page-subtitle">Авторизуйтесь, чтобы бронировать аудитории и синхронизировать расписание.</p>
      <ErrorBanner message={error ?? ''} />
      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Имя пользователя
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Пароль
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {/* TODO: добавить второй фактор аутентификации */}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </section>
  );
}

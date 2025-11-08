import { useState } from 'react';
import type { UserRole } from '../types';

interface AdminUserFormProps {
  onSubmit: (payload: { name: string; password: string; role: UserRole }) => Promise<void>;
}

const roles: UserRole[] = ['student', 'teacher', 'admin'];

export function AdminUserForm({ onSubmit }: AdminUserFormProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim() || !password.trim()) {
      setError('Имя и пароль обязательны');
      return;
    }
    try {
      setLoading(true);
      await onSubmit({ name, password, role });
      setSuccess('Пользователь создан');
      setName('');
      setPassword('');
      setRole('student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать пользователя');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="admin-user-form" onSubmit={handleSubmit}>
      <h3>Создать пользователя</h3>
      <label>
        Имя
        <input value={name} onChange={e => setName(e.target.value)} required />
      </label>
      <label>
        Пароль
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </label>
      <label>
        Роль
        <select value={role} onChange={e => setRole(e.target.value as UserRole)}>
          {roles.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Создаем...' : 'Создать пользователя'}
      </button>
    </form>
  );
}

import { useState } from 'react';
import type { RoomType } from '../types';

interface AdminRoomFormProps {
  onSubmit: (payload: { name: string; type: RoomType; booking_start?: string | null; booking_end?: string | null }) => Promise<void>;
}

const roomTypes: RoomType[] = ['public', 'admin', 'service'];

export function AdminRoomForm({ onSubmit }: AdminRoomFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('public');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: валидировать сложность названия и длину строки
    if (!name.trim()) {
      setError('Введите название кабинета');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name,
        type,
        booking_start: bookingStart || null,
        booking_end: bookingEnd || null,
      });
      setName('');
      setType('public');
      setBookingStart('');
      setBookingEnd('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать кабинет');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="admin-room-form" onSubmit={handleSubmit}>
      <h3>Создать кабинет</h3>
      <label>
        Название
        <input value={name} onChange={e => setName(e.target.value)} required />
      </label>
      <label>
        Тип кабинета
        <select value={type} onChange={e => setType(e.target.value as RoomType)}>
          {roomTypes.map(rt => (
            <option key={rt} value={rt}>{rt}</option>
          ))}
        </select>
      </label>
      <label>
        Начало окна (HH:MM)
        <input type="time" value={bookingStart} onChange={e => setBookingStart(e.target.value)} />
      </label>
      <label>
        Конец окна (HH:MM)
        <input type="time" value={bookingEnd} onChange={e => setBookingEnd(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Создаем...' : 'Создать'}
      </button>
    </form>
  );
}

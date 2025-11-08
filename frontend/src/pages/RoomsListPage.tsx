import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRooms } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { Spinner } from '../components/Spinner';
import type { Room, RoomStatus } from '../types';

const statusLabel: Record<RoomStatus, string> = {
  available: 'Свободен',
  occupied: 'Занят',
  blocked: 'Заблокирован',
};

export function RoomsListPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchRooms()
      .then(data => {
        if (isMounted) {
          setRooms(data);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки кабинетов');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <Spinner />;
  }

  return (
    <section className="page rooms-page">
      <div className="page-header">
        <div>
          <h1>Кабинеты</h1>
          <p className="page-subtitle">Отсканируйте QR на двери или выберите аудиторию вручную, чтобы посмотреть занятость и забронировать окно.</p>
        </div>
        <div className="legend">
          <span className="status-pill status-available">Свободен</span>
          <span className="status-pill status-occupied">Занят</span>
          <span className="status-pill status-blocked">Заблокирован</span>
        </div>
      </div>
      <ErrorBanner message={error ?? ''} />
      <ul className="rooms-list">
        {rooms.map(room => {
          const isOccupied = room.status === 'occupied';
          const isBlocked = room.status === 'blocked';
          const badgeClass = `status-pill status-${room.status}`;
          const current = room.current_reservation;
          const next = room.next_reservation;
          const currentEnd = current?.end_time ? new Date(current.end_time).toLocaleTimeString() : null;
          const nextStart = next?.start_time ? new Date(next.start_time).toLocaleTimeString() : null;

          return (
            <li key={room.id} className={`room-card room-${room.type}`}>
              <header className="room-card__header">
                <div className="room-card__title">
                  <h2>{room.name}</h2>
                  <span className="room-type">{room.type}</span>
                </div>
                <span className={badgeClass}>{statusLabel[room.status]}</span>
              </header>
              <div className="room-card__content">
                <div className="room-card__info">
                  {isBlocked && <p className="badge badge-warning">Кабинет временно недоступен</p>}
                  {isOccupied && current ? (
                    <p className="room-info">
                      Занят {current.user_name ?? `ID ${current.user_id}`} {currentEnd ? `до ${currentEnd}` : ''}.
                    </p>
                  ) : (
                    <p className="room-info">Свободен для брони прямо сейчас.</p>
                  )}
                  {next && !isOccupied && (
                    <p className="room-meta">
                      Следующая бронь: {nextStart ?? 'вскоре'} ({next.user_name ?? `ID ${next.user_id}`}).
                    </p>
                  )}
                </div>
                {room.qr_code_url && (
                  <div className="room-card__qr">
                    <img src={room.qr_code_url} alt={`QR кабинета ${room.name}`} />
                    <span>QR каб.</span>
                  </div>
                )}
              </div>
              <footer className="room-card__footer">
                <Link className="btn btn-outline" to={`/rooms/${room.id}`}>Открыть</Link>
                {room.qr_code_url && (
                  <a className="btn btn-secondary" href={room.qr_code_url} target="_blank" rel="noreferrer" download>
                    Скачать QR
                  </a>
                )}
              </footer>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import type { Reservation } from '../types';

interface ReservationListProps {
  reservations: Reservation[];
  onCancel?: (reservationId: number) => void;
}

export function ReservationList({ reservations, onCancel }: ReservationListProps) {
  if (!reservations.length) {
    return <p>Брони не найдены</p>;
  }

  const statusLabels: Record<Reservation['status'], string> = {
    active: 'Активна',
    finished: 'Завершена',
    cancelled: 'Отменена',
  };

  return (
    <ul className="reservation-list">
      {reservations.map(reservation => (
        <li key={reservation.id}>
          <div>
            <strong>ID: {reservation.id}</strong>
            {reservation.room_name ? ` · ${reservation.room_name}` : null}
          </div>
          <div>
            {new Date(reservation.start_time).toLocaleString()} → {new Date(reservation.end_time).toLocaleString()}
          </div>
          <span className={`status-pill status-${reservation.status} status-pill--compact`}>
            {statusLabels[reservation.status] ?? reservation.status}
          </span>
          {onCancel && reservation.status === 'active' && (
            <button type="button" className="btn btn-destructive" onClick={() => onCancel(reservation.id)}>
              Отменить
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

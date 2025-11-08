import { useEffect, useMemo, useState } from 'react';
import { cancelReservation, fetchMyReservations } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { ReservationList } from '../components/ReservationList';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import type { Reservation } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    fetchMyReservations()
      .then(data => {
        if (isMounted) {
          setReservations(data);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить брони');
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
  }, [user]);

  const activeReservations = useMemo(
    () => reservations.filter(reservation => reservation.status === 'active'),
    [reservations],
  );
  const historyReservations = useMemo(
    () => reservations.filter(reservation => reservation.status !== 'active'),
    [reservations],
  );

  const handleCancel = async (reservationId: number) => {
    try {
      await cancelReservation(reservationId);
      setReservations(prev => prev.map(reservation => (
        reservation.id === reservationId ? { ...reservation, status: 'cancelled' } : reservation
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отменить бронь');
    }
  };

  if (!user) {
    return <p>Авторизуйтесь, чтобы увидеть свои брони.</p>;
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <section className="page dashboard-page">
      <h1>Мои брони</h1>
      <p className="page-subtitle">Контролируйте активные занятия, отменяйте окна и просматривайте историю бронирований.</p>
      <ErrorBanner message={error ?? ''} />

      <section>
        <h2>Активные</h2>
        <ReservationList reservations={activeReservations} onCancel={handleCancel} />
      </section>

      <section>
        <h2>История</h2>
        {/* TODO: добавить экспорт истории в календарь */}
        <ReservationList reservations={historyReservations} />
      </section>
    </section>
  );
}

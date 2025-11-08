import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchRoom, reserveRoom } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { ReservationForm } from '../components/ReservationForm';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import type { RoomDetailResponse } from '../api/client';
import type { RoomStatus } from '../types';

interface FormRange {
  start: string;
  end: string;
}

interface SlotOption {
  id: string;
  start: string;
  end: string;
  label: string;
  originalStart: string;
  originalEnd: string;
  sameDay: boolean;
}

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

const MIN_START_OFFSET_MS = 60_000;
const DEFAULT_RESERVATION_DURATION_MS = 2 * 60 * 60 * 1000;

function ensureIsoTimezone(value: string): string {
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  return `${value}Z`;
}

function parseBackendInstant(value: string): Date {
  const normalized = ensureIsoTimezone(value);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(value);
  }
  return parsed;
}

function toDatetimeLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isoToInput(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = parseBackendInstant(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16);
  }
  return toDatetimeLocalString(parsed);
}

function roundUpToMinute(date: Date): Date {
  const result = new Date(date.getTime());
  const needsIncrement = result.getSeconds() !== 0 || result.getMilliseconds() !== 0;
  result.setSeconds(0, 0);
  if (needsIncrement) {
    result.setMinutes(result.getMinutes() + 1);
  }
  return result;
}

function inputToIso(value: string): string {
  if (!value) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}

function durationLabel(startIso: string, endIso: string): string {
  const start = parseBackendInstant(startIso).getTime();
  const end = parseBackendInstant(endIso).getTime();
  const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours && minutes) {
    return `${hours} ч ${minutes} мин`;
  }
  if (hours) {
    return `${hours} ч`;
  }
  return `${minutes} мин`;
}

export function RoomDetailPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<RoomDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [formRange, setFormRange] = useState<FormRange>({ start: '', end: '' });
  const [activeBounds, setActiveBounds] = useState<FormRange | null>(null);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);

  const id = Number(roomId);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError('Неверный идентификатор кабинета');
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchRoom(id)
      .then(response => {
        if (isMounted) {
          setData(response);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Не удалось получить данные кабинета');
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
  }, [id]);

  const handleReserve = async (start: string, end: string) => {
    if (!data) return;
    setBooking(true);
    try {
      const normalizedStart = inputToIso(start);
      const normalizedEnd = inputToIso(end);
      await reserveRoom(data.room.id, normalizedStart, normalizedEnd);
      const updated = await fetchRoom(data.room.id);
      setData(updated);
      setFormRange({ start: '', end: '' });
      setSelectedSlotId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать бронь');
    } finally {
      setBooking(false);
    }
  };

  const handleSlotSelect = useCallback((startIso: string, endIso: string) => {
    const slotStartInput = isoToInput(startIso);
    const slotEndInput = isoToInput(endIso);
    const slotStartDate = roundUpToMinute(new Date(startIso));
    const slotEndDate = roundUpToMinute(new Date(endIso));
    const nowWithBuffer = roundUpToMinute(new Date(Date.now() + MIN_START_OFFSET_MS));

    const effectiveStartDate = slotStartDate < nowWithBuffer ? nowWithBuffer : slotStartDate;

    if (effectiveStartDate >= slotEndDate) {
      setSelectionWarning('Окно уже истекло. Обновите список свободных окон и выберите другое.');
      setSelectedSlotId(null);
      setFormRange({ start: '', end: '' });
      setActiveBounds(null);
      return;
    }

    const preferredEndDate = new Date(effectiveStartDate.getTime() + DEFAULT_RESERVATION_DURATION_MS);
    const effectiveEndDate = preferredEndDate < slotEndDate ? preferredEndDate : slotEndDate;

    const nextRange: FormRange = {
      start: isoToInput(effectiveStartDate.toISOString()),
      end: isoToInput(effectiveEndDate.toISOString()),
    };

    setSelectionWarning(null);
    setSelectedSlotId(`${startIso}::${endIso}`);
    setFormRange(nextRange);
    setActiveBounds({
      start: slotStartInput,
      end: slotEndInput,
    });
  }, []);

  const handleClearSelection = () => {
    setFormRange({ start: '', end: '' });
    setSelectedSlotId(null);
    setActiveBounds(null);
    setSelectionWarning(null);
  };

  const freeSlots = data?.free_slots ?? [];
  const slotOptions: SlotOption[] = useMemo(
    () => {
      const nowWithBuffer = roundUpToMinute(new Date(Date.now() + MIN_START_OFFSET_MS));
      return freeSlots
        .map(slot => {
          const slotStart = parseBackendInstant(slot.start);
          const slotEnd = parseBackendInstant(slot.end);
          if (slotEnd <= nowWithBuffer) {
            return null;
          }
          const sameDay = slotStart.toDateString() === slotEnd.toDateString();
          const endLabel = sameDay
            ? timeFormatter.format(slotEnd)
            : `${dateFormatter.format(slotEnd)} · ${timeFormatter.format(slotEnd)}`;
          const inputStart = isoToInput(slot.start);
          const inputEnd = isoToInput(slot.end);
          return {
            id: `${slot.start}::${slot.end}`,
            start: inputStart,
            end: inputEnd,
            label: `${dateFormatter.format(slotStart)} · ${timeFormatter.format(slotStart)} — ${endLabel} (${durationLabel(
              slot.start,
              slot.end,
            )})`,
            originalStart: slot.start,
            originalEnd: slot.end,
            sameDay,
          };
        })
        .filter((option): option is SlotOption => option !== null);
    },
    [freeSlots],
  );

  useEffect(() => {
    if (!data || !user || selectedSlotId) {
      return;
    }
    const firstSlot = slotOptions[0];
    if (firstSlot) {
      handleSlotSelect(firstSlot.originalStart, firstSlot.originalEnd);
    }
  }, [data, user, slotOptions, selectedSlotId, handleSlotSelect]);

  const selectedSlot = useMemo(
    () => slotOptions.find(option => option.id === selectedSlotId) ?? null,
    [slotOptions, selectedSlotId],
  );

  const handleRangeChange = (next: FormRange) => {
    setSelectionWarning(null);
    setFormRange(next);
  };

  const selectionLabel = useMemo(() => {
    if (!formRange.start || !formRange.end) {
      return undefined;
    }
    const start = new Date(formRange.start);
    const end = new Date(formRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return undefined;
    }
    const startLabel = dateTimeFormatter.format(start);
    const endLabel = dateTimeFormatter.format(end);
    const duration = durationLabel(inputToIso(formRange.start), inputToIso(formRange.end));
    return `${startLabel} — ${endLabel} (${duration})`;
  }, [formRange.start, formRange.end]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (!data) {
    return <p>Данные недоступны</p>;
  }

  const { room, schedule } = data;
  const current = room.current_reservation;
  const statusLabel: Record<RoomStatus, string> = {
    available: 'Свободен',
    occupied: 'Занят',
    blocked: 'Заблокирован',
  };
  const scheduleStatusLabel: Record<string, string> = {
    active: 'активна',
    pending: 'ожидает',
    finished: 'завершена',
    cancelled: 'отменена',
  };
  const next = room.next_reservation;
  const nextStart = next?.start_time ? dateTimeFormatter.format(new Date(next.start_time)) : null;
  const qrUrl = room.qr_code_url;
  const bookingWindowLabel = room.booking_window && (room.booking_window.start || room.booking_window.end)
    ? `${room.booking_window.start ?? '00:00'} — ${room.booking_window.end ?? '24:00'}`
    : null;

  return (
    <section className="page room-details">
      <div className="room-details__header">
        <div>
          <h1>{room.name}</h1>
          <div className="room-header-meta">
            <span className="room-type">Тип: {room.type}</span>
            <span className={`status-pill status-${room.status}`}>{statusLabel[room.status]}</span>
          </div>
          {room.is_blocked && <p className="badge badge-warning">Кабинет временно недоступен для брони</p>}
          {room.status === 'occupied' && current && (
            <p className="room-info">
              Сейчас занят {current.user_name ?? `ID ${current.user_id}`} до {current.end_time ? timeFormatter.format(new Date(current.end_time)) : ''}.
            </p>
          )}
          {bookingWindowLabel && (
            <p className="room-meta">
              Доступен для бронирования ежедневно с {bookingWindowLabel}.
            </p>
          )}
          {next && room.status !== 'occupied' && (
            <p className="room-meta">
              Следующая бронь: {nextStart ?? 'в ближайшее время'} ({next.user_name ?? `ID ${next.user_id}`} ).
            </p>
          )}
        </div>
        {qrUrl && (
          <aside className="room-qr-panel">
            <img src={qrUrl} alt={`QR кабинета ${room.name}`} />
            <span>QR кабинета</span>
            <a href={qrUrl} download className="btn btn-outline">Скачать</a>
          </aside>
        )}
      </div>

      <section>
        <h2>Расписание</h2>
        <ul className="schedule-list">
          {schedule.map(entry => (
            <li key={entry.id} className="schedule-item">
              <div className="schedule-item__time">
                {dateTimeFormatter.format(new Date(entry.start_time))}
                <span aria-hidden> — </span>
                {dateTimeFormatter.format(new Date(entry.end_time))}
              </div>
              <div className="schedule-item__meta">
                <span className="schedule-item__user">
                  {entry.user_name ? `Бронь: ${entry.user_name}` : 'Бронь: неизвестно'}
                </span>
                <span className={`status-pill status-${entry.status} status-pill--compact`}>
                  {scheduleStatusLabel[entry.status] ?? entry.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Свободные окна (24 часа)</h2>
        {freeSlots.length ? (
          <div className="slot-grid">
            {freeSlots.map(slot => {
              const slotStart = new Date(slot.start);
              const slotEnd = new Date(slot.end);
              const isSelected = selectedSlotId === `${slot.start}::${slot.end}`;
              const sameDay = slotStart.toDateString() === slotEnd.toDateString();
              const endDateLabel = sameDay ? null : dateFormatter.format(slotEnd);
              const endTimeLabel = timeFormatter.format(slotEnd);
              return (
                <article
                  key={`${slot.start}-${slot.end}`}
                  className={`slot-card${isSelected ? ' slot-card--selected' : ''}`}
                >
                  <header>
                    <span className="slot-card__date">{dateFormatter.format(slotStart)}</span>
                    <span className="slot-card__duration">{durationLabel(slot.start, slot.end)}</span>
                  </header>
                  <p className="slot-card__time">
                    <span>{timeFormatter.format(slotStart)}</span>
                    {' — '}
                    <span>
                      {endDateLabel ? `${endDateLabel} · ` : ''}
                      {endTimeLabel}
                    </span>
                  </p>
                  {user && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleSlotSelect(slot.start, slot.end)}
                    >
                      {isSelected ? 'Окно выбрано' : 'Выбрать окно'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="slot-empty">Свободных окон нет</p>
        )}
      </section>

      {room.type === 'public' && !room.is_blocked && (
        user ? (
          <section>
            <h2>Забронировать</h2>
            <ReservationForm
              onSubmit={handleReserve}
              submitting={booking}
              value={formRange}
              displayLabel={selectionLabel ?? selectedSlot?.label}
              windowBounds={activeBounds ?? undefined}
              onReset={freeSlots.length > 1 ? handleClearSelection : undefined}
              onChange={handleRangeChange}
              hints={(
                <>
                  <p>Выберите свободное окно из списка выше, затем подтвердите бронь.</p>
                  {selectionWarning && <p className="form-error">{selectionWarning}</p>}
                </>
              )}
            />
          </section>
        ) : (
          <section className="booking-cta">
            <h2>Хотите забронировать?</h2>
            <p>Авторизуйтесь, чтобы занимать аудиторию и управлять своими окнами.</p>
            <div className="booking-cta__actions">
              <Link to="/login" className="btn btn-primary">Войти</Link>
              <Link to="/register" className="btn btn-outline">Регистрация</Link>
            </div>
          </section>
        )
      )}
    </section>
  );
}

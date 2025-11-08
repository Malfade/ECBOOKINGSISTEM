import { useState } from 'react';

interface TimeRange {
  start: string;
  end: string;
}

interface ReservationFormProps {
  onSubmit: (start: string, end: string) => Promise<void>;
  submitting?: boolean;
  value?: TimeRange;
  displayLabel?: string;
  onReset?: () => void;
  onChange?: (next: TimeRange) => void;
  windowBounds?: TimeRange;
  hints?: React.ReactNode;
}

const MIN_START_OFFSET_MS = 60_000;

function roundUpToMinute(date: Date): Date {
  const result = new Date(date.getTime());
  const needsRoundUp = result.getSeconds() !== 0 || result.getMilliseconds() !== 0;
  result.setSeconds(0, 0);
  if (needsRoundUp) {
    result.setMinutes(result.getMinutes() + 1);
  }
  return result;
}

function toDatetimeLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseInput(value: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function maxDatetime(...values: (string | undefined)[]): string | undefined {
  const dates = values
    .map(value => (typeof value === 'string' ? parseInput(value) : null))
    .filter((value): value is Date => Boolean(value));
  if (!dates.length) {
    return undefined;
  }
  const winner = dates.reduce((acc, date) => (date.getTime() > acc.getTime() ? date : acc));
  return toDatetimeLocalString(winner);
}

function validateRange(range: TimeRange, bounds?: TimeRange): string | null {
  if (!range.start || !range.end) {
    return 'Выберите время начала и конца';
  }
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Некорректный формат времени';
  }
  if (startDate >= endDate) {
    return 'Время окончания должно быть позже начала';
  }
  const now = new Date(Date.now() + MIN_START_OFFSET_MS);
  if (startDate < now) {
    return 'Начало брони должно быть в ближайшем будущем. Уточните время.';
  }
  if (bounds?.start) {
    const minDate = new Date(bounds.start);
    if (!Number.isNaN(minDate.getTime()) && startDate < minDate) {
      return 'Начало выходит за пределы выбранного окна';
    }
  }
  if (bounds?.end) {
    const maxDate = new Date(bounds.end);
    if (!Number.isNaN(maxDate.getTime()) && endDate > maxDate) {
      return 'Окончание выходит за пределы выбранного окна';
    }
  }
  return null;
}

export function ReservationForm({
  onSubmit,
  submitting = false,
  value,
  displayLabel,
  onReset,
  onChange,
  windowBounds,
  hints,
}: ReservationFormProps) {
  const range = value ?? { start: '', end: '' };
  const hasSelection = Boolean(range.start && range.end);
  const [error, setError] = useState<string | null>(null);

  const nowLimit = toDatetimeLocalString(roundUpToMinute(new Date(Date.now() + MIN_START_OFFSET_MS)));
  const minStart = maxDatetime(nowLimit, windowBounds?.start) ?? nowLimit;
  const maxStart = windowBounds?.end;
  const minEnd = maxDatetime(range.start, windowBounds?.start, minStart);
  const maxEnd = windowBounds?.end;

  const handleChange = (next: Partial<TimeRange>) => {
    const updated: TimeRange = {
      start: next.start ?? range.start,
      end: next.end ?? range.end,
    };
    setError(null);
    onChange?.(updated);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSelection) {
      setError('Выберите свободное окно');
      return;
    }

    const validationError = validateRange(range, windowBounds);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      await onSubmit(range.start, range.end);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать бронь');
    }
  };

  const handleFillWindow = () => {
    if (!windowBounds) {
      return;
    }
    const startBound = parseInput(windowBounds.start);
    const endBound = parseInput(windowBounds.end);
    const effectiveStartBound = parseInput(minStart);
    if (!startBound || !endBound || !effectiveStartBound) {
      setError('Не удалось определить временные границы выбранного окна');
      return;
    }
    if (effectiveStartBound >= endBound) {
      setError('Выбранное окно уже истекло. Обновите список свободных окон.');
      return;
    }

    setError(null);
    onChange?.({
      start: toDatetimeLocalString(effectiveStartBound),
      end: toDatetimeLocalString(endBound),
    });
  };

  return (
    <form className="reservation-form" onSubmit={handleSubmit}>
      {hasSelection ? (
        <div className="reservation-summary">
          <div>
            <span className="reservation-summary__label">Вы выбрали окно:</span>
            <strong>{displayLabel}</strong>
          </div>
          <div className="reservation-summary__actions">
            {windowBounds && (
              <button type="button" className="btn btn-tertiary" onClick={handleFillWindow}>
                Заполнить всё окно
              </button>
            )}
            {onReset && (
              <button type="button" className="btn btn-tertiary" onClick={onReset}>
                Сбросить выбор
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="form-hints">Выберите свободное окно в списке выше, чтобы подтвердить бронь.</p>
      )}

      {hints && <div className="form-hints">{hints}</div>}

      {windowBounds && (
        <div className="reservation-window-hint">
          Доступно: с {new Date(windowBounds.start).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })} до{' '}
          {new Date(windowBounds.end).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}.
        </div>
      )}

      <div className="reservation-inputs">
        <label className="reservation-input">
          <span>Начало</span>
          <input
            type="datetime-local"
            value={range.start}
            min={minStart}
            max={range.end || maxStart}
            onChange={event => handleChange({ start: event.target.value })}
            required
          />
        </label>
        <label className="reservation-input">
          <span>Окончание</span>
          <input
            type="datetime-local"
            value={range.end}
            min={minEnd}
            max={maxEnd}
            onChange={event => handleChange({ end: event.target.value })}
            required
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={!hasSelection || submitting}>
        {submitting ? 'Создаем...' : 'Забронировать'}
      </button>
    </form>
  );
}

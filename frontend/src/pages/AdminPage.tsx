import { useCallback, useEffect, useState } from 'react';
import {
  adminBulkBlockRooms,
  adminBulkCancelReservations,
  adminCreateReservation,
  adminCreateRoom,
  adminCreateUser,
  adminFetchAuditLogs,
  adminFetchStats,
  adminGenerateQr,
  adminListReservations,
  adminListRooms,
  adminListUsers,
  adminResetPassword,
  adminUpdateReservation,
  adminUpdateRoom,
  adminUpdateUser,
  fetchRoomHistory,
} from '../api/client';
import { AdminRoomForm } from '../components/AdminRoomForm';
import { AdminUserForm } from '../components/AdminUserForm';
import { ErrorBanner } from '../components/ErrorBanner';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import type {
  AdminReservation,
  AdminStats,
  AuditLogEntry,
  PaginationMeta,
  ReservationStatus,
  Room,
  RoomScheduleEntry,
  RoomStatus,
  RoomType,
  User,
  UserRole,
} from '../types';

type AdminTab = 'overview' | 'rooms' | 'reservations' | 'users' | 'logs';

const roomTypeLabel: Record<Room['type'], string> = {
  public: 'Обычные',
  admin: 'Администрация',
  service: 'Служебные',
};

const reservationStatusLabel: Record<ReservationStatus, string> = {
  active: 'Активные',
  finished: 'Завершённые',
  cancelled: 'Отменённые',
};

const userRoleLabel: Record<UserRole, string> = {
  student: 'Студенты',
  teacher: 'Преподаватели',
  admin: 'Администраторы',
};

const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ru-RU', dateTimeFormatOptions);
}

function formatBookingWindow(window?: { start: string | null; end: string | null } | null): string {
  if (!window) {
    return '—';
  }
  const { start, end } = window;
  if (!start && !end) {
    return '—';
  }
  return `${start ?? '—'} — ${end ?? '—'}`;
}

function PaginationControls({ meta, onChange }: { meta: PaginationMeta | null; onChange: (page: number) => void }) {
  if (!meta || meta.pages <= 1) {
    return null;
  }
  return (
    <div className="pagination-controls">
      <button type="button" className="btn btn-outline" onClick={() => onChange(meta.page - 1)} disabled={meta.page <= 1}>
        Назад
      </button>
      <span>
        Страница {meta.page} из {meta.pages} (всего {meta.total})
      </span>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => onChange(meta.page + 1)}
        disabled={meta.page >= meta.pages}
      >
        Вперёд
      </button>
    </div>
  );
}

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [roomData, setRoomData] = useState<Room[]>([]);
  const [roomPagination, setRoomPagination] = useState<PaginationMeta | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomQuery, setRoomQuery] = useState('');
  const [roomStatus, setRoomStatus] = useState<RoomStatus | ''>('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | 'all'>('all');
  const [roomBlockedFilter, setRoomBlockedFilter] = useState<'all' | 'blocked' | 'unblocked'>('all');
  const [roomPage, setRoomPage] = useState(1);
  const [roomPerPage] = useState(10);
  const [roomSelection, setRoomSelection] = useState<Set<number>>(new Set());
  const [roomHistory, setRoomHistory] = useState<RoomScheduleEntry[]>([]);
  const [roomHistoryRoom, setRoomHistoryRoom] = useState<number | null>(null);
  const [roomHistoryLoading, setRoomHistoryLoading] = useState(false);

  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [reservationsPagination, setReservationsPagination] = useState<PaginationMeta | null>(null);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationQuery, setReservationQuery] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState<Set<ReservationStatus>>(new Set());
  const [reservationPage, setReservationPage] = useState(1);
  const [reservationPerPage] = useState(10);
  const [reservationSelection, setReservationSelection] = useState<Set<number>>(new Set());
  const [reservationDateFilters, setReservationDateFilters] = useState({
    start_from: '',
    start_to: '',
    end_from: '',
    end_to: '',
  });
  const [editingReservationId, setEditingReservationId] = useState<number | null>(null);
  const [editingReservationValues, setEditingReservationValues] = useState({
    start_time: '',
    end_time: '',
    user_id: '',
    status: '' as ReservationStatus | '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState<PaginationMeta | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userRolesFilter, setUserRolesFilter] = useState<Set<UserRole>>(new Set());
  const [userPage, setUserPage] = useState(1);
  const [userPerPage] = useState(10);

  const handleError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof Error) {
      setGlobalError(err.message);
    } else {
      setGlobalError(fallback);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const snapshot = await adminFetchStats();
      setStats(snapshot);
    } catch (err) {
      handleError(err, 'Не удалось получить статистику');
    } finally {
      setStatsLoading(false);
    }
  }, [handleError]);

  const refreshLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const data = await adminFetchAuditLogs();
      setLogs(data);
    } catch (err) {
      handleError(err, 'Не удалось получить журнал событий');
    } finally {
      setLogsLoading(false);
    }
  }, [handleError]);

  const loadRooms = useCallback(async () => {
    try {
      setRoomLoading(true);
      setGlobalError(null);
      const { rooms, pagination } = await adminListRooms({
        page: roomPage,
        per_page: roomPerPage,
        query: roomQuery.trim() || undefined,
        status: roomStatus || undefined,
        types: roomTypeFilter === 'all' ? undefined : [roomTypeFilter],
        is_blocked:
          roomBlockedFilter === 'blocked'
            ? true
            : roomBlockedFilter === 'unblocked'
              ? false
              : undefined,
      });
      setRoomData(rooms);
      setRoomPagination(pagination);
    } catch (err) {
      handleError(err, 'Не удалось получить список кабинетов');
    } finally {
      setRoomLoading(false);
    }
  }, [handleError, roomPage, roomPerPage, roomQuery, roomStatus, roomTypeFilter, roomBlockedFilter]);

  const loadReservations = useCallback(async () => {
    try {
      setReservationsLoading(true);
      const { reservations: list, pagination } = await adminListReservations({
        page: reservationPage,
        per_page: reservationPerPage,
        query: reservationQuery.trim() || undefined,
        status: reservationStatusFilter.size ? Array.from(reservationStatusFilter) : undefined,
        start_from: reservationDateFilters.start_from || undefined,
        start_to: reservationDateFilters.start_to || undefined,
        end_from: reservationDateFilters.end_from || undefined,
        end_to: reservationDateFilters.end_to || undefined,
      });
      setReservations(list);
      setReservationsPagination(pagination);
    } catch (err) {
      handleError(err, 'Не удалось получить список броней');
    } finally {
      setReservationsLoading(false);
    }
  }, [handleError, reservationPage, reservationPerPage, reservationQuery, reservationStatusFilter, reservationDateFilters]);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const { users: list, pagination } = await adminListUsers({
        page: userPage,
        per_page: userPerPage,
        query: userQuery.trim() || undefined,
        roles: userRolesFilter.size ? Array.from(userRolesFilter) : undefined,
      });
      setUsers(list);
      setUsersPagination(pagination);
    } catch (err) {
      handleError(err, 'Не удалось получить список пользователей');
    } finally {
      setUsersLoading(false);
    }
  }, [handleError, userPage, userPerPage, userQuery, userRolesFilter]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }
    void refreshStats();
    void refreshLogs();
  }, [user, refreshStats, refreshLogs]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      void loadRooms();
    }
  }, [activeTab, loadRooms]);

  useEffect(() => {
    if (activeTab === 'reservations') {
      void loadReservations();
    }
  }, [activeTab, loadReservations]);

  useEffect(() => {
    if (activeTab === 'users') {
      void loadUsers();
    }
  }, [activeTab, loadUsers]);

  const toggleRoomSelection = (roomId: number) => {
    setRoomSelection(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const toggleReservationSelection = (reservationId: number) => {
    setReservationSelection(prev => {
      const next = new Set(prev);
      if (next.has(reservationId)) {
        next.delete(reservationId);
      } else {
        next.add(reservationId);
      }
      return next;
    });
  };

  const handleCreateRoom = async (payload: { name: string; type: RoomType; booking_start?: string | null; booking_end?: string | null }) => {
    try {
      setGlobalNotice(null);
      await adminCreateRoom(payload);
      await Promise.all([loadRooms(), refreshStats()]);
      setGlobalNotice('Кабинет создан');
    } catch (err) {
      handleError(err, 'Не удалось создать кабинет');
    }
  };

  const handleUpdateRoom = async (
    roomId: number,
    data: Partial<{ name: string; type: RoomType; is_blocked: boolean; booking_start: string | null; booking_end: string | null }>,
  ): Promise<boolean> => {
    try {
      await adminUpdateRoom(roomId, data);
      await Promise.all([loadRooms(), refreshStats()]);
      return true;
    } catch (err) {
      handleError(err, 'Не удалось обновить кабинет');
      return false;
    }
  };

  const handleEditRoomSchedule = async (room: Room) => {
    const currentStart = room.booking_window?.start ?? '';
    const currentEnd = room.booking_window?.end ?? '';
    const start = window.prompt('Начало доступного окна (HH:MM). Оставьте пустым, чтобы снять ограничение.', currentStart);
    if (start === null) {
      return;
    }
    const end = window.prompt('Окончание доступного окна (HH:MM). Оставьте пустым, чтобы снять ограничение.', currentEnd);
    if (end === null) {
      return;
    }

    const trimmedStart = start.trim();
    const trimmedEnd = end.trim();

    const success = await handleUpdateRoom(room.id, {
      booking_start: trimmedStart || null,
      booking_end: trimmedEnd || null,
    });
    if (success) {
      setGlobalNotice('Настройки расписания обновлены');
    }
  };

  const handleBulkBlockRooms = async (flag: boolean) => {
    if (!roomSelection.size) {
      setGlobalError('Выберите хотя бы один кабинет для массового действия');
      return;
    }
    try {
      await adminBulkBlockRooms(Array.from(roomSelection), flag);
      setRoomSelection(new Set());
      await Promise.all([loadRooms(), refreshStats()]);
      setGlobalNotice(flag ? 'Кабинеты заблокированы' : 'Кабинеты разблокированы');
    } catch (err) {
      handleError(err, 'Не удалось выполнить массовое действие с кабинетами');
    }
  };

  const handleLoadHistory = async (roomId: number) => {
    try {
      setRoomHistoryLoading(true);
      const data = await fetchRoomHistory(roomId);
      setRoomHistory(data);
      setRoomHistoryRoom(roomId);
    } catch (err) {
      handleError(err, 'Не удалось получить историю кабинета');
    } finally {
      setRoomHistoryLoading(false);
    }
  };

  const handleGenerateQr = async (roomId: number) => {
    try {
      await adminGenerateQr(roomId);
      setGlobalNotice('QR-код обновлён');
      await loadRooms();
    } catch (err) {
      handleError(err, 'Не удалось обновить QR-код');
    }
  };

  const handleCreateReservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const roomId = Number(formData.get('roomId'));
    const userId = Number(formData.get('userId'));
    const startTime = String(formData.get('start_time'));
    const endTime = String(formData.get('end_time'));
    if (!roomId || !userId || !startTime || !endTime) {
      setGlobalError('Заполните все поля для создания брони');
      return;
    }
    try {
      await adminCreateReservation({ roomId, userId, start_time: startTime, end_time: endTime });
      setGlobalNotice('Бронь создана');
      event.currentTarget.reset();
      await Promise.all([loadReservations(), refreshStats()]);
      if (roomHistoryRoom === roomId) {
        await handleLoadHistory(roomId);
      }
    } catch (err) {
      handleError(err, 'Не удалось создать бронь');
    }
  };

  const startEditingReservation = (reservation: AdminReservation) => {
    setEditingReservationId(reservation.id);
    setEditingReservationValues({
      start_time: reservation.start_time.slice(0, 16),
      end_time: reservation.end_time.slice(0, 16),
      user_id: reservation.user?.id ? String(reservation.user.id) : '',
      status: reservation.status,
    });
  };

  const handleUpdateReservation = async (reservationId: number) => {
    if (!editingReservationId) {
      return;
    }
    const { start_time, end_time, user_id, status } = editingReservationValues;
    const payload: Record<string, unknown> = {};
    if (start_time && end_time) {
      payload.start_time = new Date(start_time).toISOString();
      payload.end_time = new Date(end_time).toISOString();
    }
    if (user_id) {
      payload.user_id = Number(user_id);
    }
    if (status) {
      payload.status = status;
    }
    if (!Object.keys(payload).length) {
      setGlobalError('Нет изменений для сохранения');
      return;
    }
    try {
      await adminUpdateReservation(reservationId, payload);
      setGlobalNotice('Бронь обновлена');
      setEditingReservationId(null);
      await Promise.all([loadReservations(), refreshStats()]);
    } catch (err) {
      handleError(err, 'Не удалось обновить бронь');
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    try {
      await adminUpdateReservation(reservationId, { status: 'cancelled' });
      setGlobalNotice('Бронь отменена');
      await Promise.all([loadReservations(), refreshStats()]);
    } catch (err) {
      handleError(err, 'Не удалось отменить бронь');
    }
  };

  const handleBulkCancelReservations = async () => {
    if (!reservationSelection.size) {
      setGlobalError('Выберите брони для отмены');
      return;
    }
    try {
      await adminBulkCancelReservations(Array.from(reservationSelection));
      setReservationSelection(new Set());
      setGlobalNotice('Выбранные брони отменены');
      await Promise.all([loadReservations(), refreshStats()]);
    } catch (err) {
      handleError(err, 'Не удалось отменить выбранные брони');
    }
  };

  const handleCreateUser = async (payload: { name: string; password: string; role: UserRole }) => {
    try {
      await adminCreateUser(payload);
      setGlobalNotice('Пользователь создан');
      await Promise.all([loadUsers(), refreshStats()]);
      await refreshLogs();
    } catch (err) {
      handleError(err, 'Не удалось создать пользователя');
    }
  };

  const handleUpdateUser = async (userId: number, data: Partial<{ name: string; role: UserRole }>) => {
    try {
      await adminUpdateUser(userId, data);
      setGlobalNotice('Профиль пользователя обновлён');
      await Promise.all([loadUsers(), refreshStats()]);
    } catch (err) {
      handleError(err, 'Не удалось обновить пользователя');
    }
  };

  const handleResetPassword = async (userId: number) => {
    const password = window.prompt('Введите новый пароль (минимум 8 символов)');
    if (!password) return;
    try {
      await adminResetPassword(userId, password);
      setGlobalNotice('Пароль обновлён');
    } catch (err) {
      handleError(err, 'Не удалось сбросить пароль');
    }
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setGlobalError(null);
    setGlobalNotice(null);
  };

  const lastUpdated = stats ? formatDateTime(stats.updated_at) : null;

  if (!user || user.role !== 'admin') {
    return <p>Доступ запрещён.</p>;
  }

  return (
    <section className="page admin-page">
      <h1>Панель администратора</h1>
      <p className="page-subtitle">Расширенное управление кабинетами, бронированиями и пользователями.</p>
      <ErrorBanner message={globalError ?? ''} />
      {globalNotice && <p className="notice-banner">{globalNotice}</p>}

      <nav className="admin-tabs">
        {(['overview', 'rooms', 'reservations', 'users', 'logs'] as AdminTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            className={`admin-tab${activeTab === tab ? ' admin-tab--active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {{
              overview: 'Обзор',
              rooms: 'Кабинеты',
              reservations: 'Брони',
              users: 'Пользователи',
              logs: 'Журнал',
            }[tab]}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <section className="admin-overview">
          <header className="admin-overview__header">
            <h2>Сводка системы</h2>
            <button type="button" className="btn btn-outline" onClick={() => void refreshStats()} disabled={statsLoading}>
              {statsLoading ? 'Обновляем…' : 'Обновить'}
            </button>
          </header>
          {stats ? (
            <>
              {lastUpdated && <p className="stats-meta">Обновлено: {lastUpdated}</p>}
              <div className="stats-grid">
                <article className="stats-card">
                  <h3>Кабинеты</h3>
                  <ul>
                    <li>Всего: {stats.rooms.total}</li>
                    <li>Заблокировано: {stats.rooms.blocked}</li>
                    <li>Занято сейчас: {stats.rooms.active_now}</li>
                    <li>Свободно: {stats.rooms.available}</li>
                  </ul>
                  <h4>По типам</h4>
                  <ul>
                    {Object.entries(stats.rooms.by_type).map(([type, count]) => (
                      <li key={type}>{roomTypeLabel[type as RoomType] ?? type}: {count}</li>
                    ))}
                  </ul>
                </article>
                <article className="stats-card">
                  <h3>Брони</h3>
                  <ul>
                    <li>Всего: {stats.reservations.total}</li>
                    <li>Активные: {stats.reservations.active}</li>
                    <li>Предстоящие: {stats.reservations.upcoming}</li>
                  </ul>
                  <h4>По статусам</h4>
                  <ul>
                    {Object.entries(stats.reservations.by_status).map(([status, count]) => (
                      <li key={status}>{reservationStatusLabel[status as ReservationStatus] ?? status}: {count}</li>
                    ))}
                  </ul>
                </article>
                <article className="stats-card">
                  <h3>Пользователи</h3>
                  <ul>
                    <li>Всего: {stats.users.total}</li>
                  </ul>
                  <h4>По ролям</h4>
                  <ul>
                    {Object.entries(stats.users.by_role).map(([role, count]) => (
                      <li key={role}>{userRoleLabel[role as UserRole] ?? role}: {count}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </>
          ) : (
            <p>Статистика недоступна.</p>
          )}
        </section>
      )}

      {activeTab === 'rooms' && (
        <section className="admin-section">
          <header className="admin-section__header">
            <h2>Кабинеты</h2>
            <button type="button" className="btn btn-outline" onClick={() => void loadRooms()} disabled={roomLoading}>
              {roomLoading ? 'Обновляем…' : 'Перезагрузить'}
            </button>
          </header>
          <div className="admin-section__content">
            <aside className="admin-sidebar">
              <AdminRoomForm onSubmit={handleCreateRoom} />
              <div className="filter-card">
                <h3>Фильтры</h3>
                <label>
                  Поиск
                  <input
                    value={roomQuery}
                    onChange={event => setRoomQuery(event.target.value)}
                    placeholder="Название кабинета"
                  />
                </label>
                <label>
                  Статус
                  <select value={roomStatus} onChange={event => setRoomStatus(event.target.value as RoomStatus | '')}>
                    <option value="">Все</option>
                    <option value="available">Свободен</option>
                    <option value="occupied">Занят</option>
                    <option value="blocked">Заблокирован</option>
                  </select>
                </label>
                <label>
                  Тип
                  <select value={roomTypeFilter} onChange={event => setRoomTypeFilter(event.target.value as RoomType | 'all')}>
                    <option value="all">Все</option>
                    <option value="public">Обычные</option>
                    <option value="admin">Администрация</option>
                    <option value="service">Служебные</option>
                  </select>
                </label>
                <label>
                  Блокировка
                  <select value={roomBlockedFilter} onChange={event => setRoomBlockedFilter(event.target.value as typeof roomBlockedFilter)}>
                    <option value="all">Не важно</option>
                    <option value="unblocked">Только доступные</option>
                    <option value="blocked">Только заблокированные</option>
                  </select>
                </label>
                <button type="button" className="btn btn-secondary" onClick={() => { setRoomPage(1); void loadRooms(); }}>
                  Применить
                </button>
              </div>
              <section className="bulk-card">
                <h3>Массовые действия</h3>
                <p>Выбрано: {roomSelection.size}</p>
                <button type="button" className="btn btn-outline" onClick={() => void handleBulkBlockRooms(true)} disabled={!roomSelection.size}>
                  Заблокировать выбранные
                </button>
                <button type="button" className="btn btn-outline" onClick={() => void handleBulkBlockRooms(false)} disabled={!roomSelection.size}>
                  Разблокировать выбранные
                </button>
              </section>
            </aside>
            <div className="admin-table-wrapper">
              {roomLoading ? (
                <Spinner />
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Название</th>
                      <th>Статус</th>
                      <th>Тип</th>
                      <th>Окно брони</th>
                      <th>QR</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomData.map(room => (
                      <tr key={room.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={roomSelection.has(room.id)}
                            onChange={() => toggleRoomSelection(room.id)}
                          />
                        </td>
                        <td>{room.name}</td>
                        <td>
                          <span className={`status-pill status-${room.status}`}>
                            {room.status === 'available' && 'Свободен'}
                            {room.status === 'occupied' && 'Занят'}
                            {room.status === 'blocked' && 'Заблокирован'}
                          </span>
                        </td>
                        <td>{roomTypeLabel[room.type]}</td>
                        <td>{formatBookingWindow(room.booking_window ?? null)}</td>
                        <td>
                          {room.qr_code_url ? (
                            <a href={room.qr_code_url} target="_blank" rel="noreferrer">PNG</a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="admin-table__actions">
                          <button type="button" className="btn btn-tertiary" onClick={() => void handleUpdateRoom(room.id, { is_blocked: !room.is_blocked })}>
                            {room.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                          </button>
                          <button type="button" className="btn btn-tertiary" onClick={() => void handleEditRoomSchedule(room)}>
                            Настроить время
                          </button>
                          <button type="button" className="btn btn-tertiary" onClick={() => void handleGenerateQr(room.id)}>
                            Обновить QR
                          </button>
                          <button type="button" className="btn btn-tertiary" onClick={() => void handleLoadHistory(room.id)}>
                            История
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <PaginationControls meta={roomPagination} onChange={page => { setRoomPage(page); void loadRooms(); }} />

              <section className="admin-reservation-form-card">
                <h3>Создать бронь для кабинета</h3>
                <form className="admin-reservation-form" onSubmit={handleCreateReservation}>
                  <label>
                    Кабинет
                    <select name="roomId" defaultValue="">
                      <option value="" disabled>Выберите кабинет</option>
                      {roomData.map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Пользователь ID
                    <input name="userId" type="number" min={1} required />
                  </label>
                  <label>
                    Начало
                    <input name="start_time" type="datetime-local" required />
                  </label>
                  <label>
                    Окончание
                    <input name="end_time" type="datetime-local" required />
                  </label>
                  <button type="submit" className="btn btn-secondary">Создать</button>
                </form>
              </section>

              {roomHistoryRoom && (
                <section className="history-card">
                  <header>
                    <h3>История кабинета #{roomHistoryRoom}</h3>
                    <button type="button" className="btn btn-tertiary" onClick={() => { setRoomHistoryRoom(null); setRoomHistory([]); }}>
                      Скрыть
                    </button>
                  </header>
                  {roomHistoryLoading ? (
                    <Spinner />
                  ) : (
                    <ul className="history-list">
                      {roomHistory.map(item => (
                        <li key={item.id}>
                          <span>{item.user_name ?? `Пользователь ${item.user_id}`}</span>
                          <span>{formatDateTime(item.start_time)} → {formatDateTime(item.end_time)}</span>
                          <span className={`status-pill status-${item.status}`}>{item.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'reservations' && (
        <section className="admin-section">
          <header className="admin-section__header">
            <h2>Брони</h2>
            <div className="admin-section-actions">
              <button type="button" className="btn btn-outline" onClick={() => void loadReservations()} disabled={reservationsLoading}>
                {reservationsLoading ? 'Обновляем…' : 'Перезагрузить'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => void handleBulkCancelReservations()} disabled={!reservationSelection.size}>
                Отменить выбранные
              </button>
            </div>
          </header>
          <div className="admin-section__content">
            <aside className="admin-sidebar">
              <div className="filter-card">
                <h3>Фильтры</h3>
                <label>
                  Поиск
                  <input
                    value={reservationQuery}
                    onChange={event => setReservationQuery(event.target.value)}
                    placeholder="Кабинет или пользователь"
                  />
                </label>
                <fieldset>
                  <legend>Статусы</legend>
                  {(['active', 'finished', 'cancelled'] as ReservationStatus[]).map(status => (
                    <label key={status} className="checkbox">
                      <input
                        type="checkbox"
                        checked={reservationStatusFilter.has(status)}
                        onChange={event => {
                          setReservationStatusFilter(prev => {
                            const next = new Set(prev);
                            if (event.target.checked) {
                              next.add(status);
                            } else {
                              next.delete(status);
                            }
                            return next;
                          });
                        }}
                      />
                      {reservationStatusLabel[status]}
                    </label>
                  ))}
                </fieldset>
                <label>
                  Начало от
                  <input
                    type="datetime-local"
                    value={reservationDateFilters.start_from}
                    onChange={event => setReservationDateFilters(prev => ({ ...prev, start_from: event.target.value }))}
                  />
                </label>
                <label>
                  Начало до
                  <input
                    type="datetime-local"
                    value={reservationDateFilters.start_to}
                    onChange={event => setReservationDateFilters(prev => ({ ...prev, start_to: event.target.value }))}
                  />
                </label>
                <label>
                  Окончание от
                  <input
                    type="datetime-local"
                    value={reservationDateFilters.end_from}
                    onChange={event => setReservationDateFilters(prev => ({ ...prev, end_from: event.target.value }))}
                  />
                </label>
                <label>
                  Окончание до
                  <input
                    type="datetime-local"
                    value={reservationDateFilters.end_to}
                    onChange={event => setReservationDateFilters(prev => ({ ...prev, end_to: event.target.value }))}
                  />
                </label>
                <button type="button" className="btn btn-secondary" onClick={() => { setReservationPage(1); void loadReservations(); }}>
                  Применить
                </button>
              </div>
            </aside>
            <div className="admin-table-wrapper">
              {reservationsLoading ? (
                <Spinner />
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th />
                      <th>ID</th>
                      <th>Кабинет</th>
                      <th>Пользователь</th>
                      <th>Время</th>
                      <th>Статус</th>
                      <th>Изменено</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map(reservation => {
                      const isEditing = editingReservationId === reservation.id;
                      return (
                        <tr key={reservation.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={reservationSelection.has(reservation.id)}
                              onChange={() => toggleReservationSelection(reservation.id)}
                            />
                          </td>
                          <td>{reservation.id}</td>
                          <td>{reservation.room ? reservation.room.name : '—'}</td>
                          <td>{reservation.user ? `${reservation.user.name} (${reservation.user.role})` : '—'}</td>
                          <td>
                            <div className="reservation-times">
                              <span>{formatDateTime(reservation.start_time)}</span>
                              <span>→</span>
                              <span>{formatDateTime(reservation.end_time)}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill status-${reservation.status}`}>
                              {reservationStatusLabel[reservation.status]}
                            </span>
                          </td>
                          <td>{formatDateTime(reservation.updated_at)}</td>
                          <td className="admin-table__actions">
                            {isEditing ? (
                              <>
                                <div className="reservation-edit-form">
                                  <label>
                                    Начало
                                    <input
                                      type="datetime-local"
                                      value={editingReservationValues.start_time}
                                      onChange={event => setEditingReservationValues(prev => ({ ...prev, start_time: event.target.value }))}
                                    />
                                  </label>
                                  <label>
                                    Окончание
                                    <input
                                      type="datetime-local"
                                      value={editingReservationValues.end_time}
                                      onChange={event => setEditingReservationValues(prev => ({ ...prev, end_time: event.target.value }))}
                                    />
                                  </label>
                                  <label>
                                    Пользователь ID
                                    <input
                                      type="number"
                                      min={1}
                                      value={editingReservationValues.user_id}
                                      onChange={event => setEditingReservationValues(prev => ({ ...prev, user_id: event.target.value }))}
                                    />
                                  </label>
                                  <label>
                                    Статус
                                    <select
                                      value={editingReservationValues.status}
                                      onChange={event => setEditingReservationValues(prev => ({ ...prev, status: event.target.value as ReservationStatus }))}
                                    >
                                      <option value="active">Активна</option>
                                      <option value="finished">Завершена</option>
                                      <option value="cancelled">Отменена</option>
                                    </select>
                                  </label>
                                </div>
                                <div className="reservation-edit-actions">
                                  <button type="button" className="btn btn-secondary" onClick={() => void handleUpdateReservation(reservation.id)}>
                                    Сохранить
                                  </button>
                                  <button type="button" className="btn btn-tertiary" onClick={() => setEditingReservationId(null)}>
                                    Отмена
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <button type="button" className="btn btn-tertiary" onClick={() => startEditingReservation(reservation)}>
                                  Изменить
                                </button>
                                <button type="button" className="btn btn-tertiary" onClick={() => void handleCancelReservation(reservation.id)}>
                                  Отменить
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <PaginationControls meta={reservationsPagination} onChange={page => { setReservationPage(page); void loadReservations(); }} />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section className="admin-section">
          <header className="admin-section__header">
            <h2>Пользователи</h2>
            <button type="button" className="btn btn-outline" onClick={() => void loadUsers()} disabled={usersLoading}>
              {usersLoading ? 'Обновляем…' : 'Перезагрузить'}
            </button>
          </header>
          <div className="admin-section__content">
            <aside className="admin-sidebar">
              <AdminUserForm onSubmit={handleCreateUser} />
              <div className="filter-card">
                <h3>Фильтры</h3>
                <label>
                  Поиск
                  <input
                    value={userQuery}
                    onChange={event => setUserQuery(event.target.value)}
                    placeholder="Имя пользователя"
                  />
                </label>
                <fieldset>
                  <legend>Роли</legend>
                  {(['student', 'teacher', 'admin'] as UserRole[]).map(role => (
                    <label key={role} className="checkbox">
                      <input
                        type="checkbox"
                        checked={userRolesFilter.has(role)}
                        onChange={event => {
                          setUserRolesFilter(prev => {
                            const next = new Set(prev);
                            if (event.target.checked) {
                              next.add(role);
                            } else {
                              next.delete(role);
                            }
                            return next;
                          });
                        }}
                      />
                      {userRoleLabel[role]}
                    </label>
                  ))}
                </fieldset>
                <button type="button" className="btn btn-secondary" onClick={() => { setUserPage(1); void loadUsers(); }}>
                  Применить
                </button>
              </div>
            </aside>
            <div className="admin-table-wrapper">
              {usersLoading ? (
                <Spinner />
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Имя</th>
                      <th>Роль</th>
                      <th>Создан</th>
                      <th>Обновлён</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(profile => (
                      <tr key={profile.id}>
                        <td>{profile.id}</td>
                        <td>{profile.name}</td>
                        <td>{userRoleLabel[profile.role]}</td>
                        <td>{profile.created_at ? formatDateTime(profile.created_at) : '—'}</td>
                        <td>{profile.updated_at ? formatDateTime(profile.updated_at) : '—'}</td>
                        <td className="admin-table__actions">
                          <button
                            type="button"
                            className="btn btn-tertiary"
                            onClick={() => {
                              const nextName = window.prompt('Введите новое имя пользователя', profile.name);
                              if (nextName && nextName.trim() && nextName !== profile.name) {
                                void handleUpdateUser(profile.id, { name: nextName.trim() });
                              }
                            }}
                          >
                            Переименовать
                          </button>
                          <button
                            type="button"
                            className="btn btn-tertiary"
                            onClick={() => {
                              const nextRole = window.prompt('Введите роль (student, teacher, admin)', profile.role);
                              if (nextRole && ['student', 'teacher', 'admin'].includes(nextRole)) {
                                void handleUpdateUser(profile.id, { role: nextRole as UserRole });
                              }
                            }}
                          >
                            Изменить роль
                          </button>
                          <button type="button" className="btn btn-tertiary" onClick={() => void handleResetPassword(profile.id)}>
                            Сбросить пароль
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <PaginationControls meta={usersPagination} onChange={page => { setUserPage(page); void loadUsers(); }} />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'logs' && (
        <section className="admin-section">
          <header className="admin-section__header">
            <h2>Журнал действий</h2>
            <button type="button" className="btn btn-outline" onClick={() => void refreshLogs()} disabled={logsLoading}>
              {logsLoading ? 'Обновляем…' : 'Обновить'}
            </button>
          </header>
          <div className="audit-log">
            {logsLoading ? (
              <Spinner />
            ) : (
              <ul className="audit-list">
                {logs.map(log => (
                  <li key={log.id}>
                    <span className="audit-list__time">{formatDateTime(log.created_at)}</span>
                    <span className="audit-list__action">{log.action}</span>
                    <span className="audit-list__description">{log.description ?? '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

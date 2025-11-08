import { API_BASE_URL, API_TIMEOUT } from '../config';
import type {
  AdminReservation,
  AdminStats,
  ApiError,
  AuditLogEntry,
  FreeSlot,
  PaginationMeta,
  Reservation,
  ReservationStatus,
  Room,
  RoomScheduleEntry,
  RoomStatus,
  RoomType,
  User,
  UserRole,
} from '../types';

export class ApiHttpError extends Error {
  status?: number;
  payload?: ApiError;

  constructor(message: string, status?: number, payload?: ApiError) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.payload = payload;
  }
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

const defaultHeaders: HeadersInit = {
  'Content-Type': 'application/json',
};

function pickCsrfToken(method?: string, headersInit?: HeadersInit): string | null {
  const verb = method?.toUpperCase() ?? 'GET';
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') {
    return null;
  }

  if (headersInit) {
    if (headersInit instanceof Headers && headersInit.has('X-CSRF-TOKEN')) {
      return null;
    }
    if (Array.isArray(headersInit)) {
      if (headersInit.some(([key]) => key.toLowerCase() === 'x-csrf-token')) {
        return null;
      }
    } else if (typeof headersInit === 'object') {
      const headerKeys = Object.keys(headersInit as Record<string, unknown>);
      if (headerKeys.some(key => key.toLowerCase() === 'x-csrf-token')) {
        return null;
      }
    }
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(/(?:^|; )csrf_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const csrfToken = pickCsrfToken(init.method, init.headers);
    const headers: HeadersInit = {
      ...defaultHeaders,
      ...(init.headers ?? {}),
      ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers,
      signal: controller.signal,
      ...init,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorBody: ApiError = isJson ? payload : { msg: String(payload) };
      throw new ApiHttpError(errorBody.msg ?? errorBody.error ?? 'Request failed', response.status, errorBody);
    }

    return { data: payload as T, status: response.status };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== null && item !== undefined && item !== '') {
          search.append(key, String(item));
        }
      });
      return;
    }
    if (value instanceof Date) {
      search.set(key, value.toISOString());
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function login(name: string, password: string): Promise<User> {
  // TODO: добавить капчу для дополнительной защиты от brute-force
  await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
  return fetchCurrentUser();
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function registerUser(payload: { name: string; password: string; role: UserRole }): Promise<void> {
  await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function signup(payload: { name: string; password: string; role?: UserRole }): Promise<User> {
  const { data } = await apiFetch<User>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiFetch<User>('/auth/me');
  return data;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data } = await apiFetch<{ rooms: Room[] }>('/rooms');
  return data.rooms;
}

export interface RoomDetailResponse {
  room: Room;
  schedule: RoomScheduleEntry[];
  free_slots: FreeSlot[];
}

export async function fetchRoom(roomId: number): Promise<RoomDetailResponse> {
  const { data } = await apiFetch<RoomDetailResponse>(`/rooms/${roomId}`);
  return data;
}

export async function reserveRoom(roomId: number, start_time: string, end_time: string): Promise<Reservation> {
  // Проверяем корректность времени на клиенте
  const start = new Date(start_time);
  const end = new Date(end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error('Invalid time range');
  }
  const { data } = await apiFetch<{ reservation: Reservation }>(`/rooms/${roomId}/reserve`, {
    method: 'POST',
    body: JSON.stringify({ start_time, end_time }),
  });
  return data.reservation;
}

export async function fetchMyReservations(): Promise<Reservation[]> {
  const { data } = await apiFetch<{ reservations: Reservation[] }>('/reservations/mine');
  return data.reservations;
}

export async function updateReservation(
  reservationId: number,
  start_time: string,
  end_time: string,
): Promise<Reservation> {
  const { data } = await apiFetch<{ reservation: Reservation }>(`/reservations/${reservationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ start_time, end_time }),
  });
  return data.reservation;
}

export async function cancelReservation(reservationId: number): Promise<void> {
  await apiFetch(`/reservations/${reservationId}`, { method: 'DELETE' });
}

export async function fetchRoomHistory(roomId: number): Promise<RoomScheduleEntry[]> {
  const { data } = await apiFetch<{ reservations: RoomScheduleEntry[] }>(
    `/reservations/room/${roomId}/history`,
  );
  return data.reservations;
}

export async function adminCreateRoom(payload: {
  name: string;
  type: Room['type'];
  booking_start?: string | null;
  booking_end?: string | null;
}): Promise<Room> {
  const body: Record<string, unknown> = {
    name: payload.name,
    type: payload.type,
  };
  if (payload.booking_start !== undefined) {
    body.booking_start = payload.booking_start;
  }
  if (payload.booking_end !== undefined) {
    body.booking_end = payload.booking_end;
  }
  const { data } = await apiFetch<{ room: Room }>('/admin/rooms', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.room;
}

interface AdminListRoomsParams {
  page?: number;
  per_page?: number;
  query?: string;
  status?: RoomStatus | '';
  types?: RoomType[];
  is_blocked?: boolean | null;
}

export async function adminListRooms(params: AdminListRoomsParams = {}): Promise<{ rooms: Room[]; pagination: PaginationMeta }> {
  const query = buildQueryString({
    page: params.page,
    per_page: params.per_page,
    q: params.query,
    status: params.status,
    ...(params.types ? { type: params.types } : {}),
    is_blocked: params.is_blocked ?? undefined,
  });
  const { data } = await apiFetch<{ rooms: Room[]; pagination: PaginationMeta }>(`/admin/rooms${query}`);
  return data;
}

export async function adminUpdateRoom(
  roomId: number,
  payload: Partial<{
    name: string;
    type: Room['type'];
    is_blocked: boolean;
    booking_start: string | null;
    booking_end: string | null;
  }>,
): Promise<Room> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.type !== undefined) body.type = payload.type;
  if (payload.is_blocked !== undefined) body.is_blocked = payload.is_blocked;
  if (payload.booking_start !== undefined) body.booking_start = payload.booking_start;
  if (payload.booking_end !== undefined) body.booking_end = payload.booking_end;
  const { data } = await apiFetch<{ room: Room }>(`/admin/rooms/${roomId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.room;
}

export async function adminGenerateQr(roomId: number): Promise<string> {
  const { data } = await apiFetch<{ qr_code_url: string }>(`/admin/rooms/${roomId}/generate-qr`, {
    method: 'POST',
  });
  return data.qr_code_url;
}

export async function adminBulkBlockRooms(roomIds: number[], isBlocked: boolean): Promise<number> {
  const { data } = await apiFetch<{ updated: number }>('/admin/rooms/bulk/block', {
    method: 'POST',
    body: JSON.stringify({ room_ids: roomIds, is_blocked: isBlocked }),
  });
  return data.updated;
}

export async function adminCreateReservation(payload: {
  roomId: number;
  userId: number;
  start_time: string;
  end_time: string;
}): Promise<number> {
  const { data } = await apiFetch<{ reservation_id: number }>(`/admin/rooms/${payload.roomId}/reserve`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: payload.userId,
      start_time: payload.start_time,
      end_time: payload.end_time,
    }),
  });
  return data.reservation_id;
}

interface AdminListReservationsParams {
  page?: number;
  per_page?: number;
  query?: string;
  status?: ReservationStatus[];
  room_id?: number;
  user_id?: number;
  start_from?: string;
  start_to?: string;
  end_from?: string;
  end_to?: string;
}

export async function adminListReservations(
  params: AdminListReservationsParams = {},
): Promise<{ reservations: AdminReservation[]; pagination: PaginationMeta }> {
  const query = buildQueryString({
    page: params.page,
    per_page: params.per_page,
    q: params.query,
    room_id: params.room_id,
    user_id: params.user_id,
    start_from: params.start_from,
    start_to: params.start_to,
    end_from: params.end_from,
    end_to: params.end_to,
    ...(params.status ? { status: params.status } : {}),
  });

  const { data } = await apiFetch<{ reservations: AdminReservation[]; pagination: PaginationMeta }>(
    `/admin/reservations${query}`,
  );
  return data;
}

interface AdminUpdateReservationPayload {
  start_time?: string;
  end_time?: string;
  status?: ReservationStatus;
  user_id?: number;
}

export async function adminUpdateReservation(
  reservationId: number,
  payload: AdminUpdateReservationPayload,
): Promise<AdminReservation> {
  const body: Record<string, unknown> = {};
  if (payload.start_time) {
    body.start_time = payload.start_time;
  }
  if (payload.end_time) {
    body.end_time = payload.end_time;
  }
  if (payload.status) {
    body.status = payload.status;
  }
  if (payload.user_id !== undefined) {
    body.user_id = payload.user_id;
  }
  const { data } = await apiFetch<{ reservation: AdminReservation }>(`/admin/reservations/${reservationId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.reservation;
}

export async function adminBulkCancelReservations(reservationIds: number[]): Promise<number> {
  const { data } = await apiFetch<{ cancelled: number }>('/admin/reservations/bulk-cancel', {
    method: 'POST',
    body: JSON.stringify({ reservation_ids: reservationIds }),
  });
  return data.cancelled;
}

export async function adminFetchAuditLogs(): Promise<AuditLogEntry[]> {
  const { data } = await apiFetch<{ logs: AuditLogEntry[] }>('/admin/audit/logs');
  return data.logs;
}

export async function adminFetchStats(): Promise<AdminStats> {
  const { data } = await apiFetch<{ stats: AdminStats }>('/admin/stats');
  return data.stats;
}

interface AdminListUsersParams {
  page?: number;
  per_page?: number;
  query?: string;
  roles?: UserRole[];
}

export async function adminListUsers(
  params: AdminListUsersParams = {},
): Promise<{ users: User[]; pagination: PaginationMeta }> {
  const query = buildQueryString({
    page: params.page,
    per_page: params.per_page,
    q: params.query,
    ...(params.roles ? { role: params.roles } : {}),
  });
  const { data } = await apiFetch<{ users: User[]; pagination: PaginationMeta }>(`/admin/users${query}`);
  return data;
}

export async function adminCreateUser(payload: { name: string; password: string; role: UserRole }): Promise<User> {
  const { data } = await apiFetch<{ user: User }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function adminUpdateUser(
  userId: number,
  payload: Partial<{ name: string; role: UserRole }>,
): Promise<User> {
  const { data } = await apiFetch<{ user: User }>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function adminResetPassword(userId: number, password: string): Promise<User> {
  const { data } = await apiFetch<{ user: User }>(`/admin/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return data.user;
}

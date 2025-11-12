export type UserRole = 'student' | 'teacher' | 'admin';
export type RoomType = 'public' | 'admin' | 'service';
export type ReservationStatus = 'active' | 'finished' | 'cancelled';
export type RoomStatus = 'available' | 'occupied' | 'blocked';

export interface ReservationSummary {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  start_time?: string;
  end_time?: string;
}

export interface Room {
  id: number;
  name: string;
  type: RoomType;
  qr_code_url: string | null;
  is_blocked: boolean;
  status: RoomStatus;
  current_reservation: ReservationSummary | null;
  next_reservation: ReservationSummary | null;
  booking_window?: {
    start: string | null;
    end: string | null;
  };
}

export interface RoomScheduleEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
}

export interface FreeSlot {
  start: string;
  end: string;
}

export interface Reservation {
  id: number;
  room_id: number;
  room_name?: string | null;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
}

export interface AuditLogEntry {
  id: number;
  actor_id: number | null;
  action: string;
  description: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface ApiError {
  msg?: string;
  error?: string;
}

export interface AdminStats {
  rooms: {
    total: number;
    blocked: number;
    available: number;
    active_now: number;
    by_type: Record<RoomType, number>;
  };
  reservations: {
    total: number;
    active: number;
    upcoming: number;
    by_status: Record<ReservationStatus, number>;
  };
  users: {
    total: number;
    by_role: Record<UserRole, number>;
  };
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface AdminReservation {
  id: number;
  room: { id: number; name: string } | null;
  user: { id: number; name: string; role: UserRole } | null;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

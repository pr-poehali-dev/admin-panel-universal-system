const BASE = import.meta.env.VITE_API_URL || 'https://functions.poehali.dev/4a73aa4c-93c9-49d4-94f3-a7b417f90709';

type QS = Record<string, string | number | boolean | undefined>;

function buildUrl(entity: string, id?: string | number, action?: string, qs?: QS) {
  const params = new URLSearchParams({ entity, ...(id ? { id: String(id) } : {}), ...(action ? { action } : {}) });
  if (qs) Object.entries(qs).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
  return `${BASE}?${params.toString()}`;
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

// ─── GENERIC CRUD ──────────────────────────────────────────────────────────────

function makeCrud<T>(entity: string) {
  return {
    getAll: (qs?: QS): Promise<T[]> => req('GET', buildUrl(entity, undefined, undefined, qs)),
    getById: (id: number | string, qs?: QS): Promise<T> => req('GET', buildUrl(entity, id, undefined, qs)),
    create: (data: Partial<T>): Promise<T> => req('POST', buildUrl(entity), data),
    update: (id: number | string, data: Partial<T>): Promise<T> => req('PUT', buildUrl(entity, id), data),
    patch: (id: number | string, data: Partial<T>): Promise<T> => req('PATCH', buildUrl(entity, id), data),
    delete: (id: number | string): Promise<{ deleted: boolean }> => req('DELETE', buildUrl(entity, id)),
  };
}

// ─── TYPED ENTITIES ────────────────────────────────────────────────────────────

export interface Category {
  id: number; name: string; description: string; icon: string;
  color: string; device_count: number; created_at: string;
}

export interface User {
  id: number; name: string; email: string; phone: string;
  role: 'admin' | 'manager' | 'master'; status: 'active' | 'blocked';
  created_at: string; last_login: string | null; orders_count: number;
}

export interface Master {
  id: number; name: string; email: string; phone: string;
  specialization: string[]; level: 'junior' | 'middle' | 'senior';
  status: 'available' | 'busy' | 'vacation'; rating: number;
  completed_orders: number; joined_at: string; bio: string | null;
  photo_url: string | null; active_orders?: number; recent_orders?: Order[];
}

export interface Device {
  id: number; name: string; brand: string; model: string;
  category_id: number | null; serial_number: string; condition: 'new' | 'good' | 'fair' | 'poor';
  client_name: string; client_phone: string; client_email: string;
  received_at: string; notes: string; category_name?: string; category_color?: string;
  orders?: Order[];
}

export interface OrderStatus {
  id: number; name: string; color: string; description: string;
  is_terminal: boolean; sort_order: number; orders_count?: number;
}

export interface Service {
  id: number; name: string; description: string; category_id: number | null;
  price: number; duration: number; warranty: number; is_active: boolean;
  created_at: string; category_name?: string;
}

export interface Part {
  id: number; name: string; article: string; category_id: number | null;
  brand: string; quantity: number; min_quantity: number; price: number;
  supplier: string; location: string; created_at: string; category_name?: string;
}

export interface Order {
  id: number; number: string; device_id: number | null; master_id: number | null;
  status_id: number | null; diagnosis: string; total_price: number; paid_amount: number;
  created_at: string; deadline: string | null; completed_at: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent'; client_name: string; client_phone: string;
  notes: string; status_name?: string; status_color?: string;
  master_name?: string; device_name?: string; device_brand?: string;
  services?: OrderService[]; parts?: OrderPart[]; payments?: Payment[];
}

export interface OrderService { id: number; order_id: number; service_id: number; price: number; service_name?: string; }
export interface OrderPart { id: number; order_id: number; part_id: number; quantity: number; price: number; part_name?: string; article?: string; }

export interface Payment {
  id: number; order_id: number | null; amount: number;
  method: 'cash' | 'card' | 'transfer' | 'online';
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  description: string; created_at: string; order_number?: string;
}

export interface PaymentsResponse {
  items: Payment[];
  stats: Record<string, number>;
}

export interface Schedule {
  id: number; master_id: number | null; order_id: number | null;
  date: string; time_start: string; time_end: string;
  type: 'work' | 'break' | 'vacation' | 'appointment';
  notes: string; created_at: string; master_name?: string; order_number?: string;
}

export interface Notification {
  id: number; user_id: number | null; title: string; message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean; link: string | null; created_at: string;
}

export interface Analytics {
  kpi: { total: number; completed: number; revenue: number; paid: number };
  monthly: { period: string; orders_count: number; revenue: number }[];
  by_status: { name: string; color: string; cnt: number }[];
  by_priority: { priority: string; cnt: number }[];
  payment_methods: { method: string; cnt: number; total: number }[];
  masters: { name: string; rating: number; completed_orders: number; orders_period: number }[];
  categories: { name: string; color: string; devices_count: number; orders_count: number }[];
  low_stock: { name: string; quantity: number; min_quantity: number; article: string }[];
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export const categoriesApi = makeCrud<Category>('categories');
export const usersApi = makeCrud<User>('users');
export const mastersApi = {
  ...makeCrud<Master>('masters'),
  getById: (id: number | string): Promise<Master> => req('GET', buildUrl('masters', id)),
};
export const devicesApi = {
  ...makeCrud<Device>('devices'),
  getById: (id: number | string): Promise<Device> => req('GET', buildUrl('devices', id)),
};
export const statusesApi = makeCrud<OrderStatus>('statuses');
export const servicesApi = makeCrud<Service>('services');
export const partsApi = makeCrud<Part>('parts');
export const ordersApi = {
  ...makeCrud<Order>('orders'),
  getById: (id: number | string): Promise<Order> => req('GET', buildUrl('orders', id)),
};
export const paymentsApi = {
  ...makeCrud<Payment>('payments'),
  getAll: (qs?: QS): Promise<PaymentsResponse> => req('GET', buildUrl('payments', undefined, undefined, qs)),
};
export const scheduleApi = makeCrud<Schedule>('schedule');
export const notificationsApi = {
  ...makeCrud<Notification>('notifications'),
  markRead: (id: number | string) => req('PATCH', buildUrl('notifications', id, 'read')),
  markAllRead: (userId?: number) =>
    req('PATCH', buildUrl('notifications', 'read-all'), userId ? { user_id: userId } : {}),
};
export const analyticsApi = {
  get: (period?: string): Promise<Analytics> =>
    req('GET', buildUrl('analytics', undefined, undefined, period ? { period } : undefined)),
};

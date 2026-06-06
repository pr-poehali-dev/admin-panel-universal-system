export type UserRole = 'admin' | 'manager' | 'master';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'blocked';
  createdAt: string;
  lastLogin: string;
  ordersCount: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  deviceCount: number;
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  brand: string;
  model: string;
  categoryId: string;
  serialNumber: string;
  condition: 'new' | 'good' | 'fair' | 'poor';
  clientId: string;
  receivedAt: string;
  notes: string;
}

export interface Master {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string[];
  level: 'junior' | 'middle' | 'senior';
  status: 'available' | 'busy' | 'vacation';
  rating: number;
  completedOrders: number;
  joinedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  duration: number;
  warranty: number;
  isActive: boolean;
}

export interface Part {
  id: string;
  name: string;
  article: string;
  categoryId: string;
  brand: string;
  quantity: number;
  minQuantity: number;
  price: number;
  supplier: string;
  location: string;
}

export interface OrderStatus {
  id: string;
  name: string;
  color: string;
  description: string;
  isTerminal: boolean;
  order: number;
}

export interface Order {
  id: string;
  number: string;
  clientId: string;
  deviceId: string;
  masterId: string;
  statusId: string;
  services: string[];
  parts: string[];
  diagnosis: string;
  totalPrice: number;
  paidAmount: number;
  createdAt: string;
  deadline: string;
  completedAt?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'online';
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  createdAt: string;
  description: string;
}

export interface Schedule {
  id: string;
  masterId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  orderId?: string;
  type: 'work' | 'break' | 'vacation' | 'appointment';
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// ─── AUTH USERS ────────────────────────────────────────────────────────────────
export const AUTH_USERS: AuthUser[] = [
  { id: '1', name: 'Алексей Громов', email: 'admin@techservice.ru', role: 'admin' },
  { id: '2', name: 'Марина Волкова', email: 'manager@techservice.ru', role: 'manager' },
  { id: '3', name: 'Дмитрий Орлов', email: 'master@techservice.ru', role: 'master' },
];

// ─── USERS ────────────────────────────────────────────────────────────────────
let usersData: User[] = [
  { id: '1', name: 'Алексей Громов', email: 'admin@techservice.ru', phone: '+7 (900) 123-45-67', role: 'admin', status: 'active', createdAt: '2024-01-10', lastLogin: '2026-06-06', ordersCount: 0 },
  { id: '2', name: 'Марина Волкова', email: 'manager@techservice.ru', phone: '+7 (901) 234-56-78', role: 'manager', status: 'active', createdAt: '2024-02-15', lastLogin: '2026-06-05', ordersCount: 0 },
  { id: '3', name: 'Дмитрий Орлов', email: 'master@techservice.ru', phone: '+7 (902) 345-67-89', role: 'master', status: 'active', createdAt: '2024-03-20', lastLogin: '2026-06-06', ordersCount: 12 },
  { id: '4', name: 'Иван Петров', email: 'ivan.petrov@mail.ru', phone: '+7 (903) 456-78-90', role: 'master', status: 'active', createdAt: '2024-04-01', lastLogin: '2026-06-04', ordersCount: 8 },
  { id: '5', name: 'Светлана Козлова', email: 'svetlana@gmail.com', phone: '+7 (904) 567-89-01', role: 'manager', status: 'blocked', createdAt: '2024-05-12', lastLogin: '2026-05-20', ordersCount: 0 },
];

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
let categoriesData: Category[] = [
  { id: '1', name: 'Ноутбуки', description: 'Ремонт ноутбуков всех марок', icon: 'Laptop', color: '#00d4ff', deviceCount: 24, createdAt: '2024-01-01' },
  { id: '2', name: 'Смартфоны', description: 'Ремонт мобильных телефонов', icon: 'Smartphone', color: '#8b5cf6', deviceCount: 47, createdAt: '2024-01-01' },
  { id: '3', name: 'Планшеты', description: 'Ремонт планшетных компьютеров', icon: 'Tablet', color: '#10b981', deviceCount: 15, createdAt: '2024-01-15' },
  { id: '4', name: 'Настольные ПК', description: 'Сборка и ремонт системных блоков', icon: 'Monitor', color: '#f59e0b', deviceCount: 18, createdAt: '2024-02-01' },
  { id: '5', name: 'Принтеры/МФУ', description: 'Обслуживание печатной техники', icon: 'Printer', color: '#ef4444', deviceCount: 9, createdAt: '2024-02-15' },
];

// ─── DEVICES ──────────────────────────────────────────────────────────────────
let devicesData: Device[] = [
  { id: '1', name: 'MacBook Pro 14"', brand: 'Apple', model: 'A2442', categoryId: '1', serialNumber: 'C02XL0XLJGH5', condition: 'fair', clientId: 'c1', receivedAt: '2026-06-01', notes: 'Не включается, разбит экран' },
  { id: '2', name: 'iPhone 15 Pro', brand: 'Apple', model: 'A3090', categoryId: '2', serialNumber: 'F4GX8K2BN1P', condition: 'good', clientId: 'c2', receivedAt: '2026-06-02', notes: 'Разбито стекло' },
  { id: '3', name: 'Lenovo ThinkPad X1', brand: 'Lenovo', model: 'X1 Carbon Gen10', categoryId: '1', serialNumber: 'PF3N7Q21', condition: 'poor', clientId: 'c3', receivedAt: '2026-06-03', notes: 'Не работает клавиатура, залит' },
  { id: '4', name: 'Samsung Galaxy Tab S9', brand: 'Samsung', model: 'SM-X710', categoryId: '3', serialNumber: 'R5CR904KTSZ', condition: 'good', clientId: 'c4', receivedAt: '2026-06-04', notes: 'Мигает экран' },
  { id: '5', name: 'HP LaserJet Pro MFP', brand: 'HP', model: 'M428fdw', categoryId: '5', serialNumber: 'VNC3Q23047', condition: 'fair', clientId: 'c5', receivedAt: '2026-06-05', notes: 'Замятие бумаги, замена картриджа' },
];

// ─── MASTERS ──────────────────────────────────────────────────────────────────
let mastersData: Master[] = [
  { id: '1', name: 'Дмитрий Орлов', email: 'orlov@techservice.ru', phone: '+7 (902) 345-67-89', specialization: ['Ноутбуки', 'Настольные ПК'], level: 'senior', status: 'available', rating: 4.9, completedOrders: 312, joinedAt: '2022-03-15' },
  { id: '2', name: 'Артём Соколов', email: 'sokolov@techservice.ru', phone: '+7 (905) 678-90-12', specialization: ['Смартфоны', 'Планшеты'], level: 'senior', status: 'busy', rating: 4.8, completedOrders: 287, joinedAt: '2022-06-01' },
  { id: '3', name: 'Никита Зайцев', email: 'zaitsev@techservice.ru', phone: '+7 (906) 789-01-23', specialization: ['Ноутбуки', 'Смартфоны'], level: 'middle', status: 'available', rating: 4.6, completedOrders: 145, joinedAt: '2023-09-10' },
  { id: '4', name: 'Елена Смирнова', email: 'smirnova@techservice.ru', phone: '+7 (907) 890-12-34', specialization: ['Принтеры/МФУ', 'Настольные ПК'], level: 'middle', status: 'vacation', rating: 4.7, completedOrders: 198, joinedAt: '2023-01-20' },
  { id: '5', name: 'Павел Кузнецов', email: 'kuznetsov@techservice.ru', phone: '+7 (908) 901-23-45', specialization: ['Смартфоны', 'Планшеты'], level: 'junior', status: 'available', rating: 4.3, completedOrders: 54, joinedAt: '2025-04-15' },
];

// ─── SERVICES ─────────────────────────────────────────────────────────────────
let servicesData: Service[] = [
  { id: '1', name: 'Замена дисплея ноутбука', description: 'Полная замена матрицы или сборки дисплея', categoryId: '1', price: 4500, duration: 120, warranty: 90, isActive: true },
  { id: '2', name: 'Замена стекла смартфона', description: 'Замена защитного стекла/тачскрина', categoryId: '2', price: 2500, duration: 60, warranty: 30, isActive: true },
  { id: '3', name: 'Чистка от пыли (ноутбук)', description: 'Разборка, чистка системы охлаждения', categoryId: '1', price: 1200, duration: 90, warranty: 0, isActive: true },
  { id: '4', name: 'Замена батареи', description: 'Замена аккумулятора на оригинальный', categoryId: '2', price: 1800, duration: 45, warranty: 180, isActive: true },
  { id: '5', name: 'Профилактика МФУ', description: 'Чистка, замена роликов захвата бумаги', categoryId: '5', price: 900, duration: 60, warranty: 30, isActive: false },
];

// ─── PARTS ────────────────────────────────────────────────────────────────────
let partsData: Part[] = [
  { id: '1', name: 'Дисплей MacBook Pro 14" (2021)', article: 'LCD-MBP14-2021', categoryId: '1', brand: 'Apple', quantity: 3, minQuantity: 1, price: 28000, supplier: 'ТехноПарт Опт', location: 'A-01-03' },
  { id: '2', name: 'Аккумулятор iPhone 15 Pro (3274 mAh)', article: 'BAT-IP15P-3274', categoryId: '2', brand: 'Apple', quantity: 12, minQuantity: 5, price: 2200, supplier: 'МобилКомп', location: 'B-02-07' },
  { id: '3', name: 'Термопаста Arctic MX-4', article: 'THERM-ARCTIC-MX4', categoryId: '1', brand: 'Arctic', quantity: 8, minQuantity: 3, price: 350, supplier: 'ТехноПарт Опт', location: 'C-01-01' },
  { id: '4', name: 'Клавиатура Lenovo ThinkPad X1 Carbon Gen10 RU', article: 'KB-LTP-X1C10-RU', categoryId: '1', brand: 'Lenovo', quantity: 2, minQuantity: 1, price: 5500, supplier: 'ЛenovoParts', location: 'A-02-05' },
  { id: '5', name: 'Ролик захвата HP LaserJet', article: 'ROLL-HP-LJ-PRO', categoryId: '5', brand: 'HP', quantity: 0, minQuantity: 2, price: 780, supplier: 'ПринтМастер', location: 'D-03-02' },
];

// ─── ORDER STATUSES ───────────────────────────────────────────────────────────
let statusesData: OrderStatus[] = [
  { id: '1', name: 'Принят', color: '#3b82f6', description: 'Заказ принят, ожидает диагностики', isTerminal: false, order: 1 },
  { id: '2', name: 'Диагностика', color: '#f59e0b', description: 'Проводится диагностика устройства', isTerminal: false, order: 2 },
  { id: '3', name: 'В работе', color: '#8b5cf6', description: 'Мастер приступил к ремонту', isTerminal: false, order: 3 },
  { id: '4', name: 'Ожидает деталей', color: '#ef4444', description: 'Ожидается поставка запчастей', isTerminal: false, order: 4 },
  { id: '5', name: 'Готов', color: '#10b981', description: 'Ремонт завершён, ожидает выдачи', isTerminal: false, order: 5 },
  { id: '6', name: 'Выдан', color: '#6b7280', description: 'Устройство выдано клиенту', isTerminal: true, order: 6 },
];

// ─── ORDERS ───────────────────────────────────────────────────────────────────
let ordersData: Order[] = [
  { id: '1', number: 'ORD-2026-001', clientId: 'c1', deviceId: '1', masterId: '1', statusId: '3', services: ['1'], parts: ['1'], diagnosis: 'Разбита матрица, требует замены', totalPrice: 32500, paidAmount: 10000, createdAt: '2026-06-01', deadline: '2026-06-08', priority: 'high' },
  { id: '2', number: 'ORD-2026-002', clientId: 'c2', deviceId: '2', masterId: '2', statusId: '5', services: ['2'], parts: [], diagnosis: 'Трещина на стекле тачскрина', totalPrice: 2500, paidAmount: 2500, createdAt: '2026-06-02', deadline: '2026-06-03', completedAt: '2026-06-03', priority: 'normal' },
  { id: '3', number: 'ORD-2026-003', clientId: 'c3', deviceId: '3', masterId: '3', statusId: '4', services: ['3', '4'], parts: ['4', '3'], diagnosis: 'Залита жидкостью. Клавиатура не работает', totalPrice: 8800, paidAmount: 0, createdAt: '2026-06-03', deadline: '2026-06-12', priority: 'urgent' },
  { id: '4', number: 'ORD-2026-004', clientId: 'c4', deviceId: '4', masterId: '3', statusId: '2', services: ['2'], parts: [], diagnosis: 'Мерцание подсветки. Предварительно — матрица', totalPrice: 4500, paidAmount: 1500, createdAt: '2026-06-04', deadline: '2026-06-07', priority: 'normal' },
  { id: '5', number: 'ORD-2026-005', clientId: 'c5', deviceId: '5', masterId: '4', statusId: '1', services: ['5'], parts: ['5'], diagnosis: 'Замятие бумаги, износ роликов подачи', totalPrice: 1680, paidAmount: 0, createdAt: '2026-06-05', deadline: '2026-06-06', priority: 'low' },
];

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
let paymentsData: Payment[] = [
  { id: '1', orderId: '1', amount: 10000, method: 'card', status: 'completed', createdAt: '2026-06-01', description: 'Предоплата за ORD-2026-001' },
  { id: '2', orderId: '2', amount: 2500, method: 'cash', status: 'completed', createdAt: '2026-06-03', description: 'Полная оплата ORD-2026-002' },
  { id: '3', orderId: '4', amount: 1500, method: 'online', status: 'completed', createdAt: '2026-06-04', description: 'Предоплата за ORD-2026-004' },
  { id: '4', orderId: '1', amount: 22500, method: 'transfer', status: 'pending', createdAt: '2026-06-06', description: 'Остаток оплаты ORD-2026-001' },
  { id: '5', orderId: '3', amount: 8800, method: 'card', status: 'failed', createdAt: '2026-06-05', description: 'Оплата ORD-2026-003 (отклонена банком)' },
];

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
let scheduleData: Schedule[] = [
  { id: '1', masterId: '1', date: '2026-06-06', timeStart: '09:00', timeEnd: '11:00', orderId: '1', type: 'work', notes: 'Замена дисплея MacBook' },
  { id: '2', masterId: '2', date: '2026-06-06', timeStart: '10:00', timeEnd: '10:45', orderId: '2', type: 'work', notes: 'Замена стекла iPhone' },
  { id: '3', masterId: '3', date: '2026-06-07', timeStart: '09:00', timeEnd: '13:00', orderId: '3', type: 'work', notes: 'Диагностика ThinkPad' },
  { id: '4', masterId: '4', date: '2026-06-06', timeStart: '12:00', timeEnd: '13:00', type: 'break', notes: 'Обеденный перерыв' },
  { id: '5', masterId: '5', date: '2026-06-09', timeStart: '14:00', timeEnd: '15:30', type: 'appointment', notes: 'Консультация клиента' },
];

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
let notificationsData: Notification[] = [
  { id: '1', userId: '1', title: 'Заказ срочный!', message: 'Заказ ORD-2026-003 помечен как срочный', type: 'warning', isRead: false, createdAt: '2026-06-06 08:30', link: '/orders' },
  { id: '2', userId: '2', title: 'Запчасти закончились', message: 'Ролик захвата HP LaserJet: остаток 0 шт.', type: 'error', isRead: false, createdAt: '2026-06-05 17:00', link: '/parts' },
  { id: '3', userId: '1', title: 'Заказ выполнен', message: 'Мастер Соколов завершил заказ ORD-2026-002', type: 'success', isRead: true, createdAt: '2026-06-03 16:15', link: '/orders' },
  { id: '4', userId: '3', title: 'Новый заказ', message: 'Вам назначен новый заказ ORD-2026-004', type: 'info', isRead: true, createdAt: '2026-06-04 09:00' },
  { id: '5', userId: '1', title: 'Оплата отклонена', message: 'Платёж по заказу ORD-2026-003 отклонён банком', type: 'error', isRead: false, createdAt: '2026-06-05 14:22', link: '/payments' },
];

// ─── CRUD SERVICES ────────────────────────────────────────────────────────────
const delay = (ms = 200) => new Promise(res => setTimeout(res, ms));

// USERS
export const usersService = {
  getAll: async () => { await delay(); return [...usersData]; },
  getById: async (id: string) => { await delay(); return usersData.find(u => u.id === id) || null; },
  create: async (data: Omit<User, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    usersData.push(item); return item;
  },
  update: async (id: string, data: Partial<User>) => {
    await delay();
    usersData = usersData.map(u => u.id === id ? { ...u, ...data } : u);
    return usersData.find(u => u.id === id)!;
  },
  delete: async (id: string) => { await delay(); usersData = usersData.filter(u => u.id !== id); },
};

// CATEGORIES
export const categoriesService = {
  getAll: async () => { await delay(); return [...categoriesData]; },
  create: async (data: Omit<Category, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    categoriesData.push(item); return item;
  },
  update: async (id: string, data: Partial<Category>) => {
    await delay();
    categoriesData = categoriesData.map(c => c.id === id ? { ...c, ...data } : c);
    return categoriesData.find(c => c.id === id)!;
  },
  delete: async (id: string) => { await delay(); categoriesData = categoriesData.filter(c => c.id !== id); },
};

// DEVICES
export const devicesService = {
  getAll: async () => { await delay(); return [...devicesData]; },
  create: async (data: Omit<Device, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    devicesData.push(item); return item;
  },
  update: async (id: string, data: Partial<Device>) => {
    await delay();
    devicesData = devicesData.map(d => d.id === id ? { ...d, ...data } : d);
    return devicesData.find(d => d.id === id)!;
  },
  delete: async (id: string) => { await delay(); devicesData = devicesData.filter(d => d.id !== id); },
};

// MASTERS
export const mastersService = {
  getAll: async () => { await delay(); return [...mastersData]; },
  create: async (data: Omit<Master, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    mastersData.push(item); return item;
  },
  update: async (id: string, data: Partial<Master>) => {
    await delay();
    mastersData = mastersData.map(m => m.id === id ? { ...m, ...data } : m);
    return mastersData.find(m => m.id === id)!;
  },
  delete: async (id: string) => { await delay(); mastersData = mastersData.filter(m => m.id !== id); },
};

// SERVICES
export const servicesService = {
  getAll: async () => { await delay(); return [...servicesData]; },
  create: async (data: Omit<Service, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    servicesData.push(item); return item;
  },
  update: async (id: string, data: Partial<Service>) => {
    await delay();
    servicesData = servicesData.map(s => s.id === id ? { ...s, ...data } : s);
    return servicesData.find(s => s.id === id)!;
  },
  delete: async (id: string) => { await delay(); servicesData = servicesData.filter(s => s.id !== id); },
};

// PARTS
export const partsService = {
  getAll: async () => { await delay(); return [...partsData]; },
  create: async (data: Omit<Part, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    partsData.push(item); return item;
  },
  update: async (id: string, data: Partial<Part>) => {
    await delay();
    partsData = partsData.map(p => p.id === id ? { ...p, ...data } : p);
    return partsData.find(p => p.id === id)!;
  },
  delete: async (id: string) => { await delay(); partsData = partsData.filter(p => p.id !== id); },
};

// STATUSES
export const statusesService = {
  getAll: async () => { await delay(); return [...statusesData]; },
  create: async (data: Omit<OrderStatus, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    statusesData.push(item); return item;
  },
  update: async (id: string, data: Partial<OrderStatus>) => {
    await delay();
    statusesData = statusesData.map(s => s.id === id ? { ...s, ...data } : s);
    return statusesData.find(s => s.id === id)!;
  },
  delete: async (id: string) => { await delay(); statusesData = statusesData.filter(s => s.id !== id); },
};

// ORDERS
export const ordersService = {
  getAll: async () => { await delay(); return [...ordersData]; },
  create: async (data: Omit<Order, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    ordersData.push(item); return item;
  },
  update: async (id: string, data: Partial<Order>) => {
    await delay();
    ordersData = ordersData.map(o => o.id === id ? { ...o, ...data } : o);
    return ordersData.find(o => o.id === id)!;
  },
  delete: async (id: string) => { await delay(); ordersData = ordersData.filter(o => o.id !== id); },
};

// PAYMENTS
export const paymentsService = {
  getAll: async () => { await delay(); return [...paymentsData]; },
  create: async (data: Omit<Payment, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    paymentsData.push(item); return item;
  },
  update: async (id: string, data: Partial<Payment>) => {
    await delay();
    paymentsData = paymentsData.map(p => p.id === id ? { ...p, ...data } : p);
    return paymentsData.find(p => p.id === id)!;
  },
  delete: async (id: string) => { await delay(); paymentsData = paymentsData.filter(p => p.id !== id); },
};

// SCHEDULE
export const scheduleService = {
  getAll: async () => { await delay(); return [...scheduleData]; },
  create: async (data: Omit<Schedule, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    scheduleData.push(item); return item;
  },
  update: async (id: string, data: Partial<Schedule>) => {
    await delay();
    scheduleData = scheduleData.map(s => s.id === id ? { ...s, ...data } : s);
    return scheduleData.find(s => s.id === id)!;
  },
  delete: async (id: string) => { await delay(); scheduleData = scheduleData.filter(s => s.id !== id); },
};

// NOTIFICATIONS
export const notificationsService = {
  getAll: async () => { await delay(); return [...notificationsData]; },
  markRead: async (id: string) => {
    await delay();
    notificationsData = notificationsData.map(n => n.id === id ? { ...n, isRead: true } : n);
  },
  markAllRead: async () => {
    await delay();
    notificationsData = notificationsData.map(n => ({ ...n, isRead: true }));
  },
  create: async (data: Omit<Notification, 'id'>) => {
    await delay();
    const item = { ...data, id: Date.now().toString() };
    notificationsData.push(item); return item;
  },
  delete: async (id: string) => { await delay(); notificationsData = notificationsData.filter(n => n.id !== id); },
};

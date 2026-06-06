INSERT INTO t_p51861815_admin_panel_universa.categories (name, description, icon, color) VALUES
  ('Ноутбуки',     'Ремонт ноутбуков всех марок',         'Laptop',     '#00d4ff'),
  ('Смартфоны',    'Ремонт мобильных телефонов',          'Smartphone', '#8b5cf6'),
  ('Планшеты',     'Ремонт планшетных компьютеров',       'Tablet',     '#10b981'),
  ('Настольные ПК','Сборка и ремонт системных блоков',    'Monitor',    '#f59e0b'),
  ('Принтеры/МФУ', 'Обслуживание печатной техники',       'Printer',    '#ef4444');

INSERT INTO t_p51861815_admin_panel_universa.users (name, email, phone, role, status) VALUES
  ('Алексей Громов',   'admin@techservice.ru',   '+7 (900) 123-45-67', 'admin',   'active'),
  ('Марина Волкова',   'manager@techservice.ru', '+7 (901) 234-56-78', 'manager', 'active'),
  ('Дмитрий Орлов',   'master@techservice.ru',  '+7 (902) 345-67-89', 'master',  'active'),
  ('Иван Петров',      'ivan.petrov@mail.ru',    '+7 (903) 456-78-90', 'master',  'active'),
  ('Светлана Козлова', 'svetlana@gmail.com',     '+7 (904) 567-89-01', 'manager', 'blocked');

INSERT INTO t_p51861815_admin_panel_universa.masters (name, email, phone, specialization, level, status, rating, completed_orders, joined_at) VALUES
  ('Дмитрий Орлов',  'orlov@techservice.ru',     '+7 (902) 345-67-89', ARRAY['Ноутбуки','Настольные ПК'],       'senior', 'available', 4.9, 312, '2022-03-15'),
  ('Артём Соколов',  'sokolov@techservice.ru',   '+7 (905) 678-90-12', ARRAY['Смартфоны','Планшеты'],           'senior', 'busy',      4.8, 287, '2022-06-01'),
  ('Никита Зайцев',  'zaitsev@techservice.ru',   '+7 (906) 789-01-23', ARRAY['Ноутбуки','Смартфоны'],           'middle', 'available', 4.6, 145, '2023-09-10'),
  ('Елена Смирнова', 'smirnova@techservice.ru',  '+7 (907) 890-12-34', ARRAY['Принтеры/МФУ','Настольные ПК'],  'middle', 'vacation',  4.7, 198, '2023-01-20'),
  ('Павел Кузнецов', 'kuznetsov@techservice.ru', '+7 (908) 901-23-45', ARRAY['Смартфоны','Планшеты'],           'junior', 'available', 4.3, 54,  '2025-04-15');

INSERT INTO t_p51861815_admin_panel_universa.order_statuses (name, color, description, is_terminal, sort_order) VALUES
  ('Принят',           '#3b82f6', 'Заказ принят, ожидает диагностики',  FALSE, 1),
  ('Диагностика',      '#f59e0b', 'Проводится диагностика устройства',  FALSE, 2),
  ('В работе',         '#8b5cf6', 'Мастер приступил к ремонту',         FALSE, 3),
  ('Ожидает деталей',  '#ef4444', 'Ожидается поставка запчастей',       FALSE, 4),
  ('Готов',            '#10b981', 'Ремонт завершён, ожидает выдачи',    FALSE, 5),
  ('Выдан',            '#6b7280', 'Устройство выдано клиенту',          TRUE,  6);

INSERT INTO t_p51861815_admin_panel_universa.services (name, description, category_id, price, duration, warranty, is_active) VALUES
  ('Замена дисплея ноутбука',  'Полная замена матрицы или сборки дисплея',  1, 4500, 120, 90,  TRUE),
  ('Замена стекла смартфона',  'Замена защитного стекла/тачскрина',         2, 2500, 60,  30,  TRUE),
  ('Чистка от пыли (ноутбук)', 'Разборка, чистка системы охлаждения',       1, 1200, 90,  0,   TRUE),
  ('Замена батареи',           'Замена аккумулятора на оригинальный',        2, 1800, 45,  180, TRUE),
  ('Профилактика МФУ',         'Чистка, замена роликов захвата бумаги',     5, 900,  60,  30,  FALSE),
  ('Установка ОС',             'Установка Windows/Linux с настройкой',      1, 2000, 120, 30,  TRUE),
  ('Замена HDD/SSD',           'Замена жёсткого диска, перенос данных',     1, 2500, 90,  180, TRUE),
  ('Ремонт материнской платы', 'Пайка, замена компонентов МП',              4, 5000, 240, 90,  TRUE);

INSERT INTO t_p51861815_admin_panel_universa.parts (name, article, category_id, brand, quantity, min_quantity, price, supplier, location) VALUES
  ('Дисплей MacBook Pro 14" (2021)',          'LCD-MBP14-2021',   1, 'Apple',  3,  1, 28000, 'ТехноПарт Опт', 'A-01-03'),
  ('Аккумулятор iPhone 15 Pro (3274 mAh)',    'BAT-IP15P-3274',   2, 'Apple',  12, 5, 2200,  'МобилКомп',     'B-02-07'),
  ('Термопаста Arctic MX-4',                  'THERM-ARCTIC-MX4', 1, 'Arctic', 8,  3, 350,   'ТехноПарт Опт', 'C-01-01'),
  ('Клавиатура Lenovo ThinkPad X1 Carbon RU', 'KB-LTP-X1C10-RU',  1, 'Lenovo', 2,  1, 5500,  'LenovoParts',   'A-02-05'),
  ('Ролик захвата HP LaserJet',               'ROLL-HP-LJ-PRO',   5, 'HP',     0,  2, 780,   'ПринтМастер',   'D-03-02'),
  ('SSD Samsung 870 EVO 500GB',               'SSD-SAM-870-500',  1, 'Samsung',6,  2, 4200,  'СамсунгОпт',    'A-03-01'),
  ('Батарея MacBook Pro 13"',                 'BAT-MBP13-2020',   1, 'Apple',  4,  2, 8500,  'AppleParts',    'B-01-02'),
  ('Экран Samsung Galaxy S23',                'LCD-SAM-S23',      2, 'Samsung',3,  1, 6800,  'МобилКомп',     'B-03-04');

INSERT INTO t_p51861815_admin_panel_universa.devices (name, brand, model, category_id, serial_number, condition, client_name, client_phone, received_at, notes) VALUES
  ('MacBook Pro 14"',       'Apple',   'A2442',           1, 'C02XL0XLJGH5', 'fair', 'Сергей Иванов',  '+7(999)111-22-33', '2026-06-01', 'Не включается, разбит экран'),
  ('iPhone 15 Pro',         'Apple',   'A3090',           2, 'F4GX8K2BN1P',  'good', 'Анна Петрова',   '+7(999)222-33-44', '2026-06-02', 'Разбито стекло'),
  ('Lenovo ThinkPad X1',    'Lenovo',  'X1 Carbon Gen10', 1, 'PF3N7Q21',     'poor', 'Михаил Сидоров', '+7(999)333-44-55', '2026-06-03', 'Не работает клавиатура, залит'),
  ('Samsung Galaxy Tab S9', 'Samsung', 'SM-X710',         3, 'R5CR904KTSZ',  'good', 'Ольга Смирнова', '+7(999)444-55-66', '2026-06-04', 'Мигает экран'),
  ('HP LaserJet Pro MFP',   'HP',      'M428fdw',         5, 'VNC3Q23047',   'fair', 'ООО ТехноСтарт', '+7(999)555-66-77', '2026-06-05', 'Замятие бумаги');

INSERT INTO t_p51861815_admin_panel_universa.orders (number, device_id, master_id, status_id, diagnosis, total_price, paid_amount, deadline, priority, client_name, client_phone) VALUES
  ('ORD-2026-001', 1, 1, 3, 'Разбита матрица, требует замены',              32500, 10000, '2026-06-08', 'high',   'Сергей Иванов',  '+7(999)111-22-33'),
  ('ORD-2026-002', 2, 2, 5, 'Трещина на стекле тачскрина',                 2500,  2500,  '2026-06-03', 'normal', 'Анна Петрова',   '+7(999)222-33-44'),
  ('ORD-2026-003', 3, 3, 4, 'Залита жидкостью. Клавиатура не работает',   8800,  0,     '2026-06-12', 'urgent', 'Михаил Сидоров', '+7(999)333-44-55'),
  ('ORD-2026-004', 4, 3, 2, 'Мерцание подсветки. Предварительно матрица', 4500,  1500,  '2026-06-07', 'normal', 'Ольга Смирнова', '+7(999)444-55-66'),
  ('ORD-2026-005', 5, 4, 1, 'Замятие бумаги, износ роликов подачи',        1680,  0,     '2026-06-06', 'low',    'ООО ТехноСтарт', '+7(999)555-66-77');

INSERT INTO t_p51861815_admin_panel_universa.payments (order_id, amount, method, status, description) VALUES
  (1, 10000, 'card',     'completed', 'Предоплата за ORD-2026-001'),
  (2, 2500,  'cash',     'completed', 'Полная оплата ORD-2026-002'),
  (4, 1500,  'online',   'completed', 'Предоплата за ORD-2026-004'),
  (1, 22500, 'transfer', 'pending',   'Остаток оплаты ORD-2026-001'),
  (3, 8800,  'card',     'failed',    'Оплата ORD-2026-003 (отклонена банком)');

INSERT INTO t_p51861815_admin_panel_universa.schedule (master_id, order_id, date, time_start, time_end, type, notes) VALUES
  (1, 1,    '2026-06-06', '09:00', '11:00', 'work',        'Замена дисплея MacBook'),
  (2, 2,    '2026-06-06', '10:00', '10:45', 'work',        'Замена стекла iPhone'),
  (3, 3,    '2026-06-07', '09:00', '13:00', 'work',        'Диагностика ThinkPad'),
  (4, NULL, '2026-06-06', '12:00', '13:00', 'break',       'Обеденный перерыв'),
  (5, NULL, '2026-06-09', '14:00', '15:30', 'appointment', 'Консультация клиента');

INSERT INTO t_p51861815_admin_panel_universa.notifications (user_id, title, message, type, is_read) VALUES
  (1, 'Заказ срочный!',       'Заказ ORD-2026-003 помечен как срочный',        'warning', FALSE),
  (2, 'Запчасти закончились', 'Ролик захвата HP LaserJet: остаток 0 шт.',      'error',   FALSE),
  (1, 'Заказ выполнен',       'Мастер Соколов завершил заказ ORD-2026-002',    'success', TRUE),
  (3, 'Новый заказ',          'Вам назначен новый заказ ORD-2026-004',         'info',    TRUE),
  (1, 'Оплата отклонена',     'Платёж по заказу ORD-2026-003 отклонён банком', 'error',   FALSE);
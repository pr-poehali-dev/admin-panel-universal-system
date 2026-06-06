CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.categories (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    icon         VARCHAR(50)  DEFAULT 'Laptop',
    color        VARCHAR(20)  DEFAULT '#00d4ff',
    device_count INTEGER      DEFAULT 0,
    created_at   TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.users (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    email        VARCHAR(200) NOT NULL UNIQUE,
    phone        VARCHAR(50),
    role         VARCHAR(20)  NOT NULL DEFAULT 'master',
    status       VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at   TIMESTAMP    DEFAULT NOW(),
    last_login   TIMESTAMP,
    orders_count INTEGER      DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.masters (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    email            VARCHAR(200) UNIQUE,
    phone            VARCHAR(50),
    specialization   TEXT[]       DEFAULT '{}',
    level            VARCHAR(20)  DEFAULT 'junior',
    status           VARCHAR(20)  DEFAULT 'available',
    rating           NUMERIC(3,1) DEFAULT 5.0,
    completed_orders INTEGER      DEFAULT 0,
    joined_at        DATE         DEFAULT CURRENT_DATE,
    bio              TEXT,
    photo_url        TEXT
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.devices (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    brand         VARCHAR(100),
    model         VARCHAR(100),
    category_id   INTEGER,
    serial_number VARCHAR(100),
    condition     VARCHAR(20)  DEFAULT 'good',
    client_name   VARCHAR(200),
    client_phone  VARCHAR(50),
    client_email  VARCHAR(200),
    received_at   DATE         DEFAULT CURRENT_DATE,
    notes         TEXT
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.order_statuses (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    color       VARCHAR(20)  DEFAULT '#3b82f6',
    description TEXT,
    is_terminal BOOLEAN      DEFAULT FALSE,
    sort_order  INTEGER      DEFAULT 1
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.services (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INTEGER,
    price       NUMERIC(12,2) DEFAULT 0,
    duration    INTEGER       DEFAULT 60,
    warranty    INTEGER       DEFAULT 30,
    is_active   BOOLEAN       DEFAULT TRUE,
    created_at  TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.parts (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    article      VARCHAR(100),
    category_id  INTEGER,
    brand        VARCHAR(100),
    quantity     INTEGER       DEFAULT 0,
    min_quantity INTEGER       DEFAULT 1,
    price        NUMERIC(12,2) DEFAULT 0,
    supplier     VARCHAR(200),
    location     VARCHAR(100),
    created_at   TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.orders (
    id           SERIAL PRIMARY KEY,
    number       VARCHAR(50)   NOT NULL UNIQUE,
    device_id    INTEGER,
    master_id    INTEGER,
    status_id    INTEGER,
    diagnosis    TEXT,
    total_price  NUMERIC(12,2) DEFAULT 0,
    paid_amount  NUMERIC(12,2) DEFAULT 0,
    created_at   TIMESTAMP     DEFAULT NOW(),
    deadline     DATE,
    completed_at TIMESTAMP,
    priority     VARCHAR(20)   DEFAULT 'normal',
    client_name  VARCHAR(200),
    client_phone VARCHAR(50),
    notes        TEXT
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.order_services (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    price      NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.order_parts (
    id       SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    part_id  INTEGER NOT NULL,
    quantity INTEGER       DEFAULT 1,
    price    NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.payments (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER,
    amount      NUMERIC(12,2) DEFAULT 0,
    method      VARCHAR(20)   DEFAULT 'cash',
    status      VARCHAR(20)   DEFAULT 'pending',
    description TEXT,
    created_at  TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.schedule (
    id         SERIAL PRIMARY KEY,
    master_id  INTEGER,
    order_id   INTEGER,
    date       DATE        NOT NULL,
    time_start TIME        NOT NULL,
    time_end   TIME        NOT NULL,
    type       VARCHAR(20) DEFAULT 'work',
    notes      TEXT,
    created_at TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p51861815_admin_panel_universa.notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER,
    title      VARCHAR(200) NOT NULL,
    message    TEXT,
    type       VARCHAR(20)  DEFAULT 'info',
    is_read    BOOLEAN      DEFAULT FALSE,
    link       TEXT,
    created_at TIMESTAMP    DEFAULT NOW()
);
-- Your Car Your Way - Database Schema
-- Database schema for car rental application with support chat

-- Countries table
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

CREATE INDEX idx_countries_code ON countries(code);

-- Sample data
INSERT INTO countries (code, name) VALUES
('FR', 'France'),
('ES', 'España'),
('DE', 'Deutschland'),
('GB', 'United Kingdom'),
('IT', 'Italia'),
('PT', 'Portugal'),
('BE', 'Belgique'),
('NL', 'Nederland');

-- Users table (clients and support agents)

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,

    -- Address (structured for international use)
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country_id INTEGER NOT NULL REFERENCES countries(id),

    -- Driving license (required for clients only)
    license_number VARCHAR(50),
    license_expiry_date DATE,
    license_country_id INTEGER REFERENCES countries(id),

    -- Preferences
    preferred_language VARCHAR(2),
    notification_consent BOOLEAN NOT NULL DEFAULT true,

    -- Role and status
    is_support BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_support ON users(is_support);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_deleted = false;

-- Password reset tokens table

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(36) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    is_used BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token) WHERE is_used = false;

-- Agencies table

CREATE TABLE agencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country_id INTEGER NOT NULL REFERENCES countries(id),

    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),

    is_active BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT chk_valid_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_valid_longitude CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX idx_agencies_country ON agencies(country_id);
CREATE INDEX idx_agencies_city ON agencies(city);
CREATE INDEX idx_agencies_active ON agencies(is_active);

-- Vehicle categories table

CREATE TABLE vehicle_categories (
    id SERIAL PRIMARY KEY,
    code_acriss VARCHAR(4) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE INDEX idx_vehicle_categories_acriss ON vehicle_categories(code_acriss);

-- Sample data
INSERT INTO vehicle_categories (code_acriss, type, description) VALUES
('FCAR', 'Compact', 'Ford Focus or similar'),
('SSAR', 'SUV Standard', 'Renault Captur or similar'),
('PDAR', 'Premium Sedan', 'Mercedes C-Class or similar');

-- Vehicles table

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    category_id INTEGER NOT NULL REFERENCES vehicle_categories(id),
    agency_id INTEGER NOT NULL REFERENCES agencies(id),

    -- Optional
    mileage INTEGER,
    color VARCHAR(30),
    acquisition_date DATE,

    -- Status
    is_available BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT chk_valid_year CHECK (year BETWEEN 2000 AND EXTRACT(YEAR FROM CURRENT_DATE) + 1)
);

CREATE INDEX idx_vehicles_search ON vehicles(category_id, agency_id, is_available);
CREATE INDEX idx_vehicles_agency ON vehicles(agency_id);

-- Pricing rules table

CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES vehicle_categories(id),
    country_id INTEGER NOT NULL REFERENCES countries(id),

    rule_config JSONB NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_pricing_one_per_category_country UNIQUE (category_id, country_id)
);

CREATE INDEX idx_pricing_rules_lookup ON pricing_rules(category_id, country_id);
CREATE INDEX idx_pricing_rules_jsonb ON pricing_rules USING GIN (rule_config);

-- Sample rule
INSERT INTO pricing_rules (name, category_id, country_id, rule_config) VALUES
('FR Compact 2025', 1, 1, '{
  "conditions": {
    "all": [
      {"fact": "category", "operator": "equal", "value": "FCAR"},
      {"fact": "country", "operator": "equal", "value": "FR"}
    ]
  },
  "event": {
    "type": "calculate_price",
    "params": {
      "baseRatePerDay": 45,
      "kmRateOneWay": 0.40,
      "weeklyDiscountPercent": 15
    }
  }
}'::jsonb);

-- Bookings table

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    -- Reserved at booking time
    category_id INTEGER NOT NULL REFERENCES vehicle_categories(id),
    departure_agency_id INTEGER NOT NULL REFERENCES agencies(id),
    return_agency_id INTEGER NOT NULL REFERENCES agencies(id),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,

    -- Assigned later
    vehicle_id INTEGER REFERENCES vehicles(id),
    assigned_at TIMESTAMP,

    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Status
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_cancelled BOOLEAN NOT NULL DEFAULT false,

    -- Payment
    total_amount DECIMAL(10, 2) NOT NULL,
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    payment_id VARCHAR(255) NOT NULL,

    cancelled_at TIMESTAMP,

    CONSTRAINT chk_valid_dates CHECK (end_date > start_date),
    CONSTRAINT chk_valid_amount CHECK (total_amount > 0),
    CONSTRAINT chk_valid_refund CHECK (refunded_amount >= 0 AND refunded_amount <= total_amount)
);

CREATE INDEX idx_bookings_category_dates ON bookings(category_id, departure_agency_id, start_date, end_date) WHERE is_cancelled = false;
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_unassigned ON bookings(booked_at) WHERE vehicle_id IS NULL AND is_cancelled = false;

-- Conversations table (support and chat)

CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id),
    agent_id INTEGER REFERENCES users(id),

    is_chat BOOLEAN NOT NULL,

    is_closed BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMP
);

CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_conversations_agent ON conversations(agent_id, is_closed);
CREATE INDEX idx_conversations_queue ON conversations(client_id) WHERE agent_id IS NULL AND is_closed = false;

-- Messages table

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at);

-- Video sessions table

CREATE TABLE video_sessions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id),
    agent_id INTEGER REFERENCES users(id),

    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE INDEX idx_video_sessions_client ON video_sessions(client_id);
CREATE INDEX idx_video_sessions_agent ON video_sessions(agent_id);
CREATE INDEX idx_video_sessions_queue ON video_sessions(started_at) WHERE agent_id IS NULL;

-- Notifications table

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),

    notification_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL,

    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_sent BOOLEAN NOT NULL DEFAULT true,
    has_failed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_notifications_user ON notifications(user_id, sent_at);

-- Sample users for demo
INSERT INTO users (id, email, password_hash, first_name, last_name, birth_date, address_line1, address_line2, city, postal_code, country_id, preferred_language, notification_consent, is_support, is_active, is_deleted)
VALUES
(1, 'agent@ycyw.com', '$2b$10$iKAO.iDOXhyC0djMSt..9u/XXCMKbUeN.GaQKthQRMuxWVnno2VFO', 'Agent', 'Smith', '1979-01-27', '28 rue de la Chaume d''en Bas', NULL, 'Paris', '75001', 1, 'fr', true, true, true, false),
(2, 'client@ycyw.com', '$2b$10$iKAO.iDOXhyC0djMSt..9u/XXCMKbUeN.GaQKthQRMuxWVnno2VFO', 'Roland', 'LeClient', '1979-01-27', '28 rue de la Chaume d''en Bas', NULL, 'Paris', '75001', 1, 'fr', true, false, true, false);

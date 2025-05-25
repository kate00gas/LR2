\echo 'Starting database initialization...'
\set ON_ERROR_STOP on

BEGIN;

-- Удаляем все существующие таблицы и типы (для чистого старта)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;

-- Создаем ENUM тип для статусов заказа
CREATE TYPE order_status AS ENUM (
    'pending_confirmation',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'delivered',
    'cancelled'
);

-- Устанавливаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем функцию для обновления временных меток
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем таблицу пользователей
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'admin')),
    phone_number VARCHAR(50) UNIQUE,  -- Added phone_number with UNIQUE constraint
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Триггер для обновления updated_at в таблице users
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Вставляем тестовых пользователей
INSERT INTO users (user_id, username, hashed_password, role, phone_number, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', '$2b$12$CgIYZ2MutDD9PKSpkZDj1e/2AT6lOuZUwTOPMvfzKaajivDVwvLTm', 'admin', '555-0001', true),
('b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a12', 'user', '$2b$12$GrdA05.fupB2g7lo5PWkA.Y1nIbSE/sN9K4vhQZ3h5xeW8Db/WxQK', 'user', '555-0002', true);

-- Создаем таблицу ресторанов
CREATE TABLE restaurants (
    restaurant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    address VARCHAR(500) NOT NULL,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT false,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Триггер для обновления updated_at в таблице restaurants
CREATE TRIGGER set_timestamp_restaurants
BEFORE UPDATE ON restaurants
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Создаем таблицу блюд в меню
CREATE TABLE menu_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (restaurant_id, name)
);

-- Триггер для обновления updated_at в таблице menu_items
CREATE TRIGGER set_timestamp_menu_items
BEFORE UPDATE ON menu_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Создаем таблицу заказов
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    status order_status NOT NULL DEFAULT 'pending_confirmation',
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    delivery_address VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Триггер для обновления updated_at в таблице orders
CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Создаем таблицу элементов заказа
CREATE TABLE order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_item NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Триггер для обновления updated_at в таблице order_items
CREATE TRIGGER set_timestamp_order_items
BEFORE UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Создаем функцию для обновления статуса is_active ресторана
CREATE OR REPLACE FUNCTION update_restaurant_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE restaurants
    SET is_active = EXISTS (
        SELECT 1 FROM menu_items WHERE restaurant_id = NEW.restaurant_id
    )
    WHERE restaurant_id = NEW.restaurant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления is_active ресторана
CREATE TRIGGER set_restaurant_active
AFTER INSERT OR DELETE ON menu_items
FOR EACH ROW EXECUTE FUNCTION update_restaurant_active();

-- Создаем индексы для оптимизации запросов
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);

-- Вставляем тестовые данные
-- Рестораны
INSERT INTO restaurants (name, description, address, phone_number, email, latitude, longitude, is_active) VALUES
('Pizza Palace', 'Лучшая пицца в городе', 'ул. Центральная, 12', '8-900-555-11-11', 'contact@pizzapalace.com', 40.7128, -74.0060, true),
('Sushi Spot', 'Свежие и вкусные суши', 'пр-т Боковой, 45', '8-900-555-22-22', 'info@sushispot.com', 40.7135, -74.0075, true),
('Burger Bonanza', 'Сочные бургеры и картофель фри', 'просп. Бургеров, 78', '8-900-555-33-33', 'eat@burgerbonanza.com', 40.7110, -74.0050, true),
('Taco Haven', 'Аутентичные мексиканские тако', 'ул. Тако, 101,', '8-900-555-44-44', 'taco@haven.com', 40.7100, -74.0040, false);

-- Меню для Pizza Palace
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available)
SELECT restaurant_id, 'Маргарита', 'Классическая пицца с сыром и томатами', 590, 'Пицца', true FROM restaurants WHERE name = 'Pizza Palace'
UNION ALL
SELECT restaurant_id, 'Пепперони', 'Пицца с ломтиками пепперони', 670, 'Пицца', true FROM restaurants WHERE name = 'Pizza Palace'
UNION ALL
SELECT restaurant_id, 'Салат Цезарь', 'Свежий салат романо с соусом цезарь', 340, 'Салаты', true FROM restaurants WHERE name = 'Pizza Palace';

-- Меню для Sushi Spot
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available)
SELECT restaurant_id, 'Калифорния ролл', 'Краб, авокадо, огурец', 430, 'Роллы', true FROM restaurants WHERE name = 'Sushi Spot'
UNION ALL
SELECT restaurant_id, 'Сяке нигири', 'Ломтик лосося на рисе (2 шт.)', 270, 'Нигири', true FROM restaurants WHERE name = 'Sushi Spot'
UNION ALL
SELECT restaurant_id, 'Мисо суп', 'Традиционный японский суп', 170, 'Супы', false FROM restaurants WHERE name = 'Sushi Spot';

-- Меню для Burger Bonanza
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available)
SELECT restaurant_id, 'Классический бургер', 'Говяжья котлета, салат, помидор, лук', 520, 'Бургеры', true FROM restaurants WHERE name = 'Burger Bonanza'
UNION ALL
SELECT restaurant_id, 'Чизбургер', 'Классический бургер с сыром', 570, 'Бургеры', true FROM restaurants WHERE name = 'Burger Bonanza'
UNION ALL
SELECT restaurant_id, 'Картофель фри', 'Хрустящий картофель фри', 210, 'Гарниры', true FROM restaurants WHERE name = 'Burger Bonanza';

-- Тестовый заказ
DO $$
DECLARE
    rest_id UUID;
    item1_id UUID;
    item2_id UUID;
    item1_price NUMERIC;
    item2_price NUMERIC;
    new_order_id UUID;
BEGIN
    SELECT restaurant_id INTO rest_id FROM restaurants WHERE name = 'Pizza Palace' LIMIT 1;
    SELECT item_id, price INTO item1_id, item1_price FROM menu_items WHERE name = 'Margherita' AND restaurant_id = rest_id LIMIT 1;
    SELECT item_id, price INTO item2_id, item2_price FROM menu_items WHERE name = 'Caesar Salad' AND restaurant_id = rest_id LIMIT 1;

    IF rest_id IS NOT NULL AND item1_id IS NOT NULL AND item2_id IS NOT NULL THEN
        new_order_id := uuid_generate_v4();

        INSERT INTO orders (order_id, user_id, restaurant_id, total_amount, delivery_address, status)
        VALUES (new_order_id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', rest_id,
               (1 * item1_price) + (1 * item2_price), '500 App Ln, Client City', 'delivered');

        INSERT INTO order_items (order_id, item_id, quantity, price_per_item)
        VALUES
            (new_order_id, item1_id, 1, item1_price),
            (new_order_id, item2_id, 1, item2_price);
    END IF;
END $$;

COMMIT;

\echo 'Database initialization complete with test data.'


---- Файл: database/init_db.sql
--
--
--\echo 'Starting database initialization...'
--\set ON_ERROR_STOP on
--
--BEGIN;
--
---- Удаляем все существующие таблицы (для чистого старта)
--DROP TABLE IF EXISTS order_items CASCADE;
--DROP TABLE IF EXISTS orders CASCADE;
--DROP TABLE IF EXISTS menu_items CASCADE;
--DROP TABLE IF EXISTS restaurants CASCADE;
--DROP TYPE IF EXISTS order_status CASCADE;
--
---- Создаем ENUM тип для статусов
--CREATE TYPE order_status AS ENUM (
--    'pending_confirmation',
--    'confirmed',
--    'preparing',
--    'ready_for_pickup',
--    'delivered',
--    'cancelled'
--);
--
---- Устанавливаем расширения
--CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
---- ... existing DROP TABLE and CREATE TYPE statements ...
--
---- Create the trigger function for updating timestamps
--CREATE OR REPLACE FUNCTION trigger_set_timestamp()
--RETURNS TRIGGER AS $$
--BEGIN
--    NEW.updated_at = NOW();
--    RETURN NEW;
--END;
--$$ LANGUAGE plpgsql;
--
---- Create the users table
--CREATE TABLE users (
--    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--    username VARCHAR(255) NOT NULL UNIQUE,
--    hashed_password VARCHAR(255) NOT NULL,
--    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'admin')),
--    is_active BOOLEAN DEFAULT true,
--    created_at TIMESTAMPTZ DEFAULT NOW(),
--    updated_at TIMESTAMPTZ DEFAULT NOW()
--);
--
---- Trigger for updating updated_at in users table
--CREATE TRIGGER set_timestamp_users
--BEFORE UPDATE ON users
--FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
--
---- Insert test users (replace hashes with your generated ones)
--INSERT INTO users (user_id, username, hashed_password, role, is_active) VALUES
--('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', '$2b$12$CgIYZ2MutDD9PKSpkZDj1e/2AT6lOuZUwTOPMvfzKaajivDVwvLTm', 'admin', true),
--('b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a12', 'user', '$2b$12$GrdA05.fupB2g7lo5PWkA.Y1nIbSE/sN9K4vhQZ3h5xeW8Db/WxQK', 'user', true);
--
---- Таблица Ресторанов
--CREATE TABLE restaurants (
--    restaurant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--    name VARCHAR(255) NOT NULL UNIQUE,
--    description TEXT,
--    address VARCHAR(500) NOT NULL,
--    phone_number VARCHAR(50),
--    email VARCHAR(255),
--    is_active BOOLEAN DEFAULT false,  -- Changed default to false
--    latitude NUMERIC(9, 6),
--    longitude NUMERIC(9, 6),
--    created_at TIMESTAMPTZ DEFAULT NOW(),
--    updated_at TIMESTAMPTZ DEFAULT NOW()
--);
--
---- Таблица Блюд в Меню
--CREATE TABLE menu_items (
--    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
--    name VARCHAR(255) NOT NULL,
--    description TEXT,
--    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
--    category VARCHAR(100),
--    is_available BOOLEAN DEFAULT true,
--    created_at TIMESTAMPTZ DEFAULT NOW(),
--    updated_at TIMESTAMPTZ DEFAULT NOW(),
--    UNIQUE (restaurant_id, name)
--);
--
---- Таблица Заказов
--CREATE TABLE orders (
--    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--    user_id UUID NOT NULL,
--    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
--    status order_status NOT NULL DEFAULT 'pending_confirmation',
--    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
--    delivery_address VARCHAR(500) NOT NULL,
--    created_at TIMESTAMPTZ DEFAULT NOW(),
--    updated_at TIMESTAMPTZ DEFAULT NOW()
--);
--
---- Таблица Элементов Заказа
--CREATE TABLE order_items (
--    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
--    item_id UUID REFERENCES menu_items(item_id) ON DELETE SET NULL,
--    quantity INTEGER NOT NULL CHECK (quantity > 0),
--    price_per_item NUMERIC(10, 2) NOT NULL
--);
--
---- Создаем индексы
--CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
--CREATE INDEX idx_orders_user_id ON orders(user_id);
--CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
--CREATE INDEX idx_orders_status ON orders(status);
--CREATE INDEX idx_order_items_order_id ON order_items(order_id);
--CREATE INDEX idx_order_items_item_id ON order_items(item_id);
--
---- Вставляем тестовые данные
---- Рестораны
--INSERT INTO restaurants (name, description, address, phone_number, email, latitude, longitude, is_active) VALUES
--('Pizza Palace', 'Best pizza in town', '123 Main St, Food City', '555-1111', 'contact@pizzapalace.com', 40.7128, -74.0060, true),
--('Sushi Spot', 'Fresh and delicious sushi', '456 Side Ave, Food City', '555-2222', 'info@sushispot.com', 40.7135, -74.0075, true),
--('Burger Bonanza', 'Juicy burgers and fries', '789 Burger Blvd, Food City', '555-3333', 'eat@burgerbonanza.com', 40.7110, -74.0050, true),
--('Taco Haven', 'Authentic Mexican tacos', '101 Taco Rd, Food City', '555-4444', 'taco@haven.com', 40.7100, -74.0040, false);  -- No menu, so is_active=false
--
---- Меню для Pizza Palace
--INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available)
--SELECT restaurant_id, 'Margherita', 'Classic cheese and tomato pizza', 12.99, 'Pizza', true FROM restaurants WHERE name = 'Pizza Palace'
--UNION ALL
--SELECT restaurant_id, 'Pepperoni', 'Pizza with pepperoni slices', 14.50, 'Pizza', true FROM restaurants WHERE name = 'Pizza Palace'
--UNION ALL
--SELECT restaurant_id, 'Caesar Salad', 'Fresh romaine lettuce with Caesar dressing', 8.00, 'Salad', true FROM restaurants WHERE name = 'Pizza Palace';
--
---- Меню для Sushi Spot
--INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available)
--SELECT restaurant_id, 'California Roll', 'Crab, avocado, cucumber', 9.50, 'Rolls', true FROM restaurants WHERE name = 'Sushi Spot'
--UNION ALL
--SELECT restaurant_id, 'Salmon Nigiri', 'Slice of salmon over rice (2 pcs)', 6.00, 'Nigiri', true FROM restaurants WHERE name = 'Sushi Spot'
--UNION ALL
--SELECT restaurant_id, 'Miso Soup', 'Traditional Japanese soup', 3.50, 'Soup', false FROM restaurants WHERE name = 'Sushi Spot';
--
---- Меню для Burger Bonanza
--INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available)
--SELECT restaurant_id, 'Classic Burger', 'Beef patty, lettuce, tomato, onion', 10.99, 'Burgers', true FROM restaurants WHERE name = 'Burger Bonanza'
--UNION ALL
--SELECT restaurant_id, 'Cheese Burger', 'Classic burger with cheese', 11.99, 'Burgers', true FROM restaurants WHERE name = 'Burger Bonanza'
--UNION ALL
--SELECT restaurant_id, 'Fries', 'Crispy potato fries', 4.50, 'Sides', true FROM restaurants WHERE name = 'Burger Bonanza';
--
---- Тестовый заказ
--DO $$
--DECLARE
--    rest_id UUID;
--    item1_id UUID;
--    item2_id UUID;
--    item1_price NUMERIC;
--    item2_price NUMERIC;
--    new_order_id UUID;
--BEGIN
--    SELECT restaurant_id INTO rest_id FROM restaurants WHERE name = 'Pizza Palace' LIMIT 1;
--    SELECT item_id, price INTO item1_id, item1_price FROM menu_items WHERE name = 'Margherita' AND restaurant_id = rest_id LIMIT 1;
--    SELECT item_id, price INTO item2_id, item2_price FROM menu_items WHERE name = 'Caesar Salad' AND restaurant_id = rest_id LIMIT 1;
--
--    IF rest_id IS NOT NULL AND item1_id IS NOT NULL AND item2_id IS NOT NULL THEN
--        new_order_id := uuid_generate_v4();
--
--        INSERT INTO orders (order_id, user_id, restaurant_id, total_amount, delivery_address, status)
--        VALUES (new_order_id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', rest_id,
--               (1 * item1_price) + (1 * item2_price), '500 App Ln, Client City', 'delivered');
--
--        INSERT INTO order_items (order_id, item_id, quantity, price_per_item)
--        VALUES
--            (new_order_id, item1_id, 1, item1_price),
--            (new_order_id, item2_id, 1, item2_price);
--    END IF;
--END $$;
--
---- Функция для обновления временных меток
--CREATE OR REPLACE FUNCTION trigger_set_timestamp()
--RETURNS TRIGGER AS $$
--BEGIN
--    NEW.updated_at = NOW();
--    RETURN NEW;
--END;
--$$ LANGUAGE plpgsql;
--
---- Триггеры для автоматического обновления updated_at
--CREATE TRIGGER set_timestamp_restaurants
--BEFORE UPDATE ON restaurants
--FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
--
--CREATE TRIGGER set_timestamp_menu_items
--BEFORE UPDATE ON menu_items
--FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
--
--CREATE TRIGGER set_timestamp_orders
--BEFORE UPDATE ON orders
--FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
--
--CREATE OR REPLACE FUNCTION update_restaurant_active()
--RETURNS TRIGGER AS $$
--BEGIN
--    UPDATE restaurants
--    SET is_active = EXISTS (
--        SELECT 1 FROM menu_items WHERE restaurant_id = NEW.restaurant_id
--    )
--    WHERE restaurant_id = NEW.restaurant_id;
--    RETURN NEW;
--END;
--$$ LANGUAGE plpgsql;
--
--CREATE TRIGGER set_restaurant_active
--AFTER INSERT OR DELETE ON menu_items
--FOR EACH ROW EXECUTE FUNCTION update_restaurant_active();
--
--COMMIT;
--
--\echo "Database initialization complete with test data."



-- ============================================================================
-- ViePOS Database Migration v2
-- Xóa toàn bộ DB cũ và tạo lại 13 bảng mới + ENUMs
-- ============================================================================

-- 1. XÓA BẢNG VÀ ENUM CŨ (Cẩn thận: Sẽ xóa toàn bộ dữ liệu hiện tại!)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS service_sessions CASCADE;
DROP TABLE IF EXISTS service_cards CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS account_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Drop old schema tables just in case
DROP TABLE IF EXISTS card_session CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS pin_change_request CASCADE;
DROP TABLE IF EXISTS pin_reset_request CASCADE;

-- 2. TẠO ENUM TYPES
DROP TYPE IF EXISTS employee_status CASCADE;
CREATE TYPE employee_status AS ENUM ('ACTIVE', 'RESIGNED');

DROP TYPE IF EXISTS employee_role CASCADE;
CREATE TYPE employee_role AS ENUM ('STAFF', 'ADMIN', 'ROOT_ADMIN');

DROP TYPE IF EXISTS request_type_enum CASCADE;
CREATE TYPE request_type_enum AS ENUM ('REGISTER', 'CHANGE_PIN', 'RESET_PIN');

DROP TYPE IF EXISTS request_status CASCADE;
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

DROP TYPE IF EXISTS card_type_enum CASCADE;
CREATE TYPE card_type_enum AS ENUM ('PHYSICAL', 'QR', 'NFC');

DROP TYPE IF EXISTS card_status CASCADE;
CREATE TYPE card_status AS ENUM ('AVAILABLE', 'IN_USE', 'DISABLED');

DROP TYPE IF EXISTS service_type_enum CASCADE;
CREATE TYPE service_type_enum AS ENUM ('PACKAGE_4H', 'FULLTIME', 'TAKEAWAY', 'FOUR_HOURS', 'FULL_DAY');

DROP TYPE IF EXISTS session_status CASCADE;
CREATE TYPE session_status AS ENUM ('ACTIVE', 'COMPLETED');

DROP TYPE IF EXISTS order_status CASCADE;
CREATE TYPE order_status AS ENUM ('COMPLETED', 'CANCELLED');

DROP TYPE IF EXISTS payment_method_enum CASCADE;
CREATE TYPE payment_method_enum AS ENUM ('CASH', 'BANK_TRANSFER');

DROP TYPE IF EXISTS transaction_type_enum CASCADE;
CREATE TYPE transaction_type_enum AS ENUM ('IMPORT', 'EXPORT', 'SALE', 'ADJUSTMENT', 'DAMAGE');

DROP TYPE IF EXISTS audit_action CASCADE;
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT');

DROP TYPE IF EXISTS audit_source CASCADE;
CREATE TYPE audit_source AS ENUM ('ADMIN', 'POS', 'SYSTEM', 'API');

-- 3. TẠO BẢNG
-- (1.2) EMPLOYEES
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    personal_email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    hire_date DATE,
    end_date DATE,
    status employee_status NOT NULL DEFAULT 'ACTIVE',
    role employee_role NOT NULL DEFAULT 'STAFF',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE
);

-- (1.1) USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL REFERENCES employees(employee_id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    pin_change_count INT NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMP
);

-- (1.3) ACCOUNT_REQUESTS
CREATE TABLE account_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code VARCHAR(50) UNIQUE NOT NULL,
    request_type request_type_enum NOT NULL,
    employee_id VARCHAR(50) REFERENCES employees(employee_id),
    request_full_name VARCHAR(255),
    request_email VARCHAR(255),
    request_phone VARCHAR(20),
    request_pin_hash VARCHAR(255) NOT NULL,
    status request_status NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(50) REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- (2.1) CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    default_price_takeaway DECIMAL(15,2) NOT NULL DEFAULT 0,
    default_price_package_4h DECIMAL(15,2) NOT NULL DEFAULT 0,
    default_price_package_fullday DECIMAL(15,2) NOT NULL DEFAULT 0,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- (2.2) PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    description TEXT,
    image_url TEXT,
    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    price_takeaway DECIMAL(15,2) NOT NULL DEFAULT 0,
    price_package_4h DECIMAL(15,2) NOT NULL DEFAULT 0,
    price_package_fullday DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_custom_price BOOLEAN NOT NULL DEFAULT FALSE,
    service_price_updated_at TIMESTAMP,
    unit VARCHAR(50) NOT NULL DEFAULT 'ly',
    current_stock DECIMAL(15,2) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_out_of_stock BOOLEAN NOT NULL DEFAULT FALSE,
    preparation_time INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- (3.1) SERVICE_CARDS
CREATE TABLE service_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_code VARCHAR(50) UNIQUE NOT NULL,
    rfid_uid VARCHAR(100) UNIQUE,
    card_type card_type_enum NOT NULL DEFAULT 'PHYSICAL',
    status card_status NOT NULL DEFAULT 'AVAILABLE',
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- (3.2) SERVICE_SESSIONS
CREATE TABLE service_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(50) UNIQUE NOT NULL,
    card_id UUID NOT NULL REFERENCES service_cards(id),
    order_id UUID UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    service_type service_type_enum NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_end_at TIMESTAMP,
    actual_end_at TIMESTAMP,
    status session_status NOT NULL DEFAULT 'ACTIVE',
    note TEXT,
    updated_at TIMESTAMP
);

-- (4.1) ORDERS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    session_id UUID REFERENCES service_sessions(id),
    created_by VARCHAR(50) NOT NULL REFERENCES employees(employee_id),
    subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    note TEXT,
    status order_status NOT NULL DEFAULT 'COMPLETED',
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ALTER SERVICE_SESSIONS to add FK to ORDERS (Circular reference resolved)
ALTER TABLE service_sessions ADD CONSTRAINT fk_session_order FOREIGN KEY (order_id) REFERENCES orders(id) DEFERRABLE INITIALLY DEFERRED;

-- (4.2) ORDER_ITEMS
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    service_type service_type_enum NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    note TEXT
);

-- (4.3) PAYMENTS
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_method payment_method_enum NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    transfer_proof_image_url TEXT,
    paid_at TIMESTAMP
);

-- (5.1) INVENTORY_TRANSACTIONS
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inven_transaction_id VARCHAR(50) UNIQUE NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    reference_id UUID,
    created_by UUID NOT NULL REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- (5.2) INVENTORY_ITEMS
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inven_transaction_id UUID NOT NULL REFERENCES inventory_transactions(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    stock_before DECIMAL(15,2) NOT NULL,
    stock_after DECIMAL(15,2) NOT NULL
);

-- (6) AUDIT_LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    action audit_action NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_fields JSONB,
    action_source audit_source,
    ip_address VARCHAR(100),
    device_info TEXT,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

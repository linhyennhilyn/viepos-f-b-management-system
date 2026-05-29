// ===============================
// ViePOS Database Design
// ===============================

Table USERS {
  id uuid [pk]
  employee_id varchar(50) [unique, not null]
  email varchar(255) [unique, not null]
  password varchar(255) [not null]
  avatar_url text
  pin_change_count int [not null, default: 0]
  last_login_at timestamp
  created_at timestamp [not null]
  updated_at timestamp
  deleted_at timestamp
  failed_login_attempts int [not null, default: 0]
  lockout_until timestamp
}

Table EMPLOYEES {
  id uuid [pk]
  employee_id varchar(50) [unique, not null]
  full_name varchar(255) [not null]
  personal_email varchar(255) [unique, not null]
  phone varchar(20) [unique, not null]
  hire_date date
  end_date date
  status enum("ACTIVE", "RESIGNED") [not null]
  role enum("STAFF", "ADMIN", "ROOT_ADMIN") [not null]
  is_active boolean [not null, default: true]
  is_locked boolean [not null, default: false]
}

Table ACCOUNT_REQUESTS {
  id uuid [pk]
  request_code varchar(50) [unique, not null]
  request_type enum("REGISTER", "CHANGE_PIN", "RESET_PIN") [not null]

  employee_id varchar(50)

  request_full_name varchar(255)
  request_email varchar(255)
  request_phone varchar(20)

  request_pin_hash varchar(255) [not null]

  status enum("PENDING", "APPROVED", "REJECTED") [not null]

  approved_by varchar(50)

  approved_at timestamp
  rejected_reason text

  created_at timestamp [not null]
}

Table CATEGORIES {
  id uuid [pk]

  category_code varchar(50) [unique, not null]

  name varchar(255) [unique, not null]

  description text

  image_url text

  default_price_takeaway decimal(15,2) [not null]
  default_price_package_4h decimal(15,2) [not null]
  default_price_package_fullday decimal(15,2) [not null]

  display_order int [not null, default: 0]

  is_active boolean [not null, default: true]

  created_at timestamp [not null]
  updated_at timestamp
}

Table PRODUCTS {
  id uuid [pk]

  product_code varchar(50) [unique, not null]

  sku varchar(100) [unique]

  category_id uuid [not null]

  name varchar(255) [not null]

  short_name varchar(100)

  description text

  image_url text

  cost_price decimal(15,2) [not null]

  price_takeaway decimal(15,2) [not null]

  price_package_4h decimal(15,2) [not null]

  price_package_fullday decimal(15,2) [not null]

  is_custom_price boolean [not null, default: false]

  service_price_updated_at timestamp

  unit varchar(50) [not null]

  current_stock decimal(15,2) [not null, default: 0]

  minimum_stock decimal(15,2) [not null]

  is_active boolean [not null, default: true]

  is_out_of_stock boolean [not null, default: false]

  preparation_time int

  created_at timestamp [not null]

  updated_at timestamp
}

Table SERVICE_CARDS {
  id uuid [pk]

  card_code varchar(50) [unique, not null]

  rfid_uid varchar(100) [unique]

  card_type enum("PHYSICAL", "QR", "NFC") [not null]

  status enum("AVAILABLE", "IN_USE", "DISABLED") [not null]

  note text

  created_at timestamp [not null]

  updated_at timestamp
}

Table SERVICE_SESSIONS {
  id uuid [pk]

  session_code varchar(50) [unique, not null]

  card_id uuid [not null]

  order_id uuid [unique, not null]

  created_by uuid [not null]

  service_type enum("PACKAGE_4H", "FULLTIME") [not null]

  started_at timestamp [not null]

  expected_end_at timestamp

  actual_end_at timestamp

  status enum("ACTIVE", "COMPLETED") [not null]

  note text

  updated_at timestamp
}

Table ORDERS {
  id uuid [pk]

  order_code varchar(50) [unique, not null]

  session_id uuid

  created_by varchar(50) [not null]

  subtotal_amount decimal(12,2) [not null]

  discount_amount decimal(12,2) [not null, default: 0]

  tax_amount decimal(12,2) [not null, default: 0]

  total_amount decimal(12,2) [not null]

  note text

  status enum("COMPLETED", "CANCELLED") [not null]

  completed_at timestamp

  created_at timestamp [not null]
}

Table ORDER_ITEMS {
  id uuid [pk]

  order_id uuid [not null]

  product_id uuid [not null]

  service_type enum("TAKEAWAY", "FOUR_HOURS", "FULL_DAY") [not null]

  quantity int [not null]

  unit_price decimal(12,2) [not null]

  line_total decimal(12,2) [not null]

  note text
}

Table PAYMENTS {
  id uuid [pk]

  payment_code varchar(50) [unique, not null]

  order_id uuid [not null]

  payment_method enum("CASH", "BANK_TRANSFER") [not null]

  amount decimal(12,2) [not null]

  transfer_proof_image_url text

  paid_at timestamp
}

Table INVENTORY_TRANSACTIONS {
  id uuid [pk]

  inven_transaction_id uuid [not null]

  product_id uuid [not null]

  transaction_type enum("IMPORT", "SALE", "ADJUSTMENT", "DAMAGE") [not null]

  reference_id uuid

  created_by uuid [not null]

  note text

  created_at timestamp [not null]
}

Table INVENTORY_ITEMS {
  id uuid [pk]

  inven_transaction_id uuid [not null]

  product_id uuid [not null]

  quantity decimal(15,2) [not null]

  unit_cost decimal(15,2) [not null]

  stock_before decimal(15,2) [not null]

  stock_after decimal(15,2) [not null]
}

Table AUDIT_LOGS {
  id uuid [pk]

  audit_code varchar(50) [unique, not null]

  user_id uuid

  action enum(
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "APPROVE",
    "REJECT"
  ) [not null]

  entity_type varchar(100) [not null]

  entity_id uuid [not null]

  old_values jsonb

  new_values jsonb

  changed_fields jsonb

  action_source enum("ADMIN", "POS", "SYSTEM", "API")

  ip_address varchar(100)

  device_info text

  note text

  created_at timestamp [not null]
}

// ===============================
// RELATIONSHIPS
// ===============================

// USERS ↔ EMPLOYEES
Ref: USERS.employee_id > EMPLOYEES.employee_id

// ACCOUNT REQUESTS
Ref: ACCOUNT_REQUESTS.employee_id > EMPLOYEES.employee_id
Ref: ACCOUNT_REQUESTS.approved_by > EMPLOYEES.employee_id

// PRODUCTS ↔ CATEGORIES
Ref: PRODUCTS.category_id > CATEGORIES.id

// SERVICE SESSIONS
Ref: SERVICE_SESSIONS.card_id > SERVICE_CARDS.id
Ref: SERVICE_SESSIONS.created_by > USERS.id
Ref: SERVICE_SESSIONS.order_id - ORDERS.id

// ORDERS
Ref: ORDERS.session_id > SERVICE_SESSIONS.id
Ref: ORDERS.created_by > EMPLOYEES.employee_id

// ORDER ITEMS
Ref: ORDER_ITEMS.order_id > ORDERS.id
Ref: ORDER_ITEMS.product_id > PRODUCTS.id

// PAYMENTS
Ref: PAYMENTS.order_id > ORDERS.id

// INVENTORY TRANSACTIONS
Ref: INVENTORY_TRANSACTIONS.product_id > PRODUCTS.id
Ref: INVENTORY_TRANSACTIONS.created_by > USERS.id

// INVENTORY ITEMS
Ref: INVENTORY_ITEMS.inven_transaction_id > INVENTORY_TRANSACTIONS.id
Ref: INVENTORY_ITEMS.product_id > PRODUCTS.id

// AUDIT LOGS
Ref: AUDIT_LOGS.user_id > USERS.id

// OPTIONAL SOFT REFERENCES
// inventory_transactions.reference_id
// Có thể tham chiếu:
// - orders.id khi transaction_type = SALE
// - inventory_transactions.id khác nếu cần adjustment chain

Ref: "CATEGORIES"."id" < "ACCOUNT_REQUESTS"."id"

Ref: "INVENTORY_TRANSACTIONS"."id" < "INVENTORY_TRANSACTIONS"."created_by"
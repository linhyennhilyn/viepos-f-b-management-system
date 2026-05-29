# ViePOS — Entity Design & UI Field Mapping

Tài liệu này định nghĩa 13 bảng database và ánh xạ từng trường dữ liệu với giao diện người dùng.

---

## (1.1) EMPLOYEES

```dbml
Table EMPLOYEES {
  id uuid [pk]
  employee_id varchar(50) [unique, not null]  // Format: EMP0001
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
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `id` | Không hiển thị | Không nhập | Auto gen UUID |
| `employee_id` | Cột "Mã NV" — Admin > Nhân viên | Không nhập | Auto gen: EMP0001 |
| `full_name` | Cột "Họ và Tên" — Admin > Nhân viên | Form "Thêm nhân viên" → field "Tên nhân viên" | |
| `personal_email` | Cột "Email" — Admin > Nhân viên | Form "Thêm nhân viên" → field "Email" | Trùng với `users.email` |
| `phone` | Cột "Số điện thoại" — Admin > Nhân viên | Form "Thêm nhân viên" → field "SĐT" | |
| `hire_date` | Modal "Xem chi tiết NV" | Form "Thêm nhân viên" → field "Ngày vào làm" | |
| `end_date` | Modal "Xem chi tiết NV" | Tự set khi chuyển `status = RESIGNED` | |
| `status` | Badge "Đang làm việc / Đã nghỉ" — bảng NV | Form "Sửa nhân viên" → dropdown "Trạng thái" | |
| `role` | Cột "Vai trò" — Admin > Nhân viên | Form "Thêm/Sửa NV" → dropdown "Vai trò" | |
| `is_active` | Không hiển thị trực tiếp | Toggle ẩn/hiện tài khoản | false → không đăng nhập được |
| `is_locked` | Không hiển thị trực tiếp | Hệ thống tự lock hoặc Admin lock | |

---

## (1.2) USERS

```dbml
Table USERS {
  id uuid [pk]
  employee_id varchar(50) [unique, not null]  // FK → employees.employee_id
  email varchar(255) [unique, not null]
  password varchar(255) [not null]             // bcrypt hash
  avatar_url text
  pin_change_count int [not null, default: 0]
  last_login_at timestamp
  created_at timestamp [not null]
  updated_at timestamp
  deleted_at timestamp
  failed_login_attempts int [not null, default: 0]
  lockout_until timestamp
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `id` | Không hiển thị | Không nhập | Auto gen UUID |
| `employee_id` | Không hiển thị trực tiếp | Liên kết khi Admin tạo tài khoản | FK → employees |
| `email` | Trang Login → field "Email" | Form đăng ký nhân viên → "Email" | |
| `password` | Không hiển thị | POS Login → numpad PIN | Bcrypt hash |
| `avatar_url` | Ảnh đại diện — POS Account Page | Chưa có UI upload | Dự phòng tương lai |
| `pin_change_count` | Modal "Xem chi tiết NV" | Không nhập | Tự tăng khi PIN đổi |
| `last_login_at` | Modal "Xem chi tiết NV" | Không nhập | Tự set khi login OK |
| `created_at` | Cột "Thời gian duyệt" — Lịch sử phê duyệt | Không nhập | Auto now() |
| `failed_login_attempts` | Không hiển thị | Không nhập | Reset về 0 khi login OK |
| `lockout_until` | Không hiển thị | Không nhập | Set khi sai PIN > 5 lần |

---

## (1.3) ACCOUNT_REQUESTS

```dbml
Table ACCOUNT_REQUESTS {
  id uuid [pk]
  request_code varchar(50) [unique, not null]   // Format: REQ000001
  request_type enum("REGISTER", "CHANGE_PIN", "RESET_PIN") [not null]
  employee_id varchar(50)                        // FK → employees.employee_id; NULL nếu REGISTER
  request_full_name varchar(255)                 // Bắt buộc với REGISTER
  request_email varchar(255)
  request_phone varchar(20)
  request_pin_hash varchar(255) [not null]
  status enum("PENDING", "APPROVED", "REJECTED") [not null]
  approved_by varchar(50)                        // FK → employees.employee_id
  approved_at timestamp
  rejected_reason text
  created_at timestamp [not null]
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `request_code` | Không hiển thị | Không nhập | Auto gen REQ000001 |
| `request_type` | Sub-tab "Tài khoản mới / Đổi mã PIN / Quên mã PIN" | Xác định loại request | |
| `employee_id` | Không hiển thị | NULL cho REGISTER | FK |
| `request_full_name` | Cột "Họ và Tên" — Tab Yêu cầu NV | POS Register → field "Họ tên" | |
| `request_email` | Cột "Email" — Tab Yêu cầu NV | POS Register → field "Email" | |
| `request_phone` | Cột "Số điện thoại" — Tab Yêu cầu NV | POS Register → field "SĐT" | |
| `request_pin_hash` | Không hiển thị | POS Register/PIN → Numpad PIN | Bcrypt hash |
| `status` | Badge "Đã duyệt / Đã từ chối" — Tab Lịch sử | Nút "Duyệt / Từ chối" Admin | |
| `approved_by` | Không hiển thị | Tự set = ID người đang đăng nhập | |
| `approved_at` | Cột "Thời gian duyệt" — Lịch sử phê duyệt | Không nhập | Tự set khi approve/reject |
| `rejected_reason` | Modal từ chối → "Lý do từ chối" | Textarea trong modal reject | |
| `created_at` | Cột "Thời gian gửi" — Tab Yêu cầu NV | Không nhập | Auto now() |

---

## (2.1) CATEGORIES

```dbml
Table CATEGORIES {
  id uuid [pk]
  category_code varchar(50) [unique, not null]         // Format: CAT0001
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
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `id` | Không hiển thị | Không nhập | Auto gen UUID |
| `category_code` | Không hiển thị | Không nhập | Auto gen CAT0001 |
| `name` | Cột "Danh Mục" — Admin > Danh mục; Tab Category — POS Sales | Form "Thêm danh mục" → "Tên Danh Mục" | |
| `description` | Modal "Xem Danh Mục" | Form "Thêm danh mục" → "Mô tả" (nếu có) | Hiện tại UI chưa có field này |
| `image_url` | Chưa hiển thị trong UI | Chưa có UI upload | Dự phòng |
| `default_price_takeaway` | Bảng "Bảng đối chiếu giá" — Modal Cấu hình giá HL | Form "Thêm danh mục" → "Mang Đi" | |
| `default_price_package_4h` | Bảng "Bảng đối chiếu giá" — Modal Cấu hình giá HL | Form "Thêm danh mục" → "Tại chỗ 4H" | |
| `default_price_package_fullday` | Bảng "Bảng đối chiếu giá" — Modal Cấu hình giá HL | Form "Thêm danh mục" → "Tại chỗ Cả ngày" | |
| `display_order` | Thứ tự tab trên POS Sales | Chưa có UI drag-drop | Sort ASC |
| `is_active` | Không hiển thị trực tiếp | Toggle ẩn danh mục | false → không hiện trên POS |
| `updated_at` | "Cập nhật lần cuối vào..." — Modal Chỉnh sửa danh mục | Không nhập | Auto update |

---

## (2.2) PRODUCTS

```dbml
Table PRODUCTS {
  id uuid [pk]
  product_code varchar(50) [unique, not null]   // Format: PRD0001
  sku varchar(100) [unique]
  category_id uuid [not null]                   // FK → categories.id
  name varchar(255) [not null]
  short_name varchar(100)
  description text
  image_url text
  cost_price decimal(15,2) [not null]           // Mặc định 0
  price_takeaway decimal(15,2) [not null]
  price_package_4h decimal(15,2) [not null]
  price_package_fullday decimal(15,2) [not null]
  is_custom_price boolean [not null, default: false]
  service_price_updated_at timestamp
  unit varchar(50) [not null]                   // Mặc định: ly
  current_stock decimal(15,2) [not null, default: 0]
  minimum_stock decimal(15,2) [not null]
  is_active boolean [not null, default: true]
  is_out_of_stock boolean [not null, default: false]
  preparation_time int
  created_at timestamp [not null]
  updated_at timestamp
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `product_code` | Không hiển thị | Không nhập | Auto gen PRD0001 |
| `sku` | Cột "SKU" — Admin > Kho | Form "Thêm sản phẩm" → "SKU/Mã vạch" | |
| `category_id` | Cột "Danh Mục" — Admin > Sản phẩm & Kho | Form "Thêm SP" → Dropdown "Danh mục" | |
| `name` | Cột "Sản Phẩm" — Kho, Lịch sử; Card sản phẩm — POS Sales | Form "Thêm sản phẩm" → "Tên sản phẩm" | |
| `short_name` | Card nhỏ — POS Sales (nếu name quá dài) | Form "Thêm SP" → "Tên rút gọn" | |
| `image_url` | Card sản phẩm — POS Sales | Form "Thêm SP" → Upload ảnh | |
| `price_takeaway` | Giá hiển thị khi chọn Takeaway — POS Sales | Form "Thêm SP" → "Giá Mang Đi" | Inherit từ category, có thể override |
| `price_package_4h` | Giá hiển thị khi chọn 4H — POS Sales | Form "Thêm SP" → "Giá 4H" | |
| `price_package_fullday` | Giá hiển thị khi chọn Cả ngày — POS Sales | Form "Thêm SP" → "Giá Cả ngày" | |
| `is_custom_price` | Không hiển thị trực tiếp | Tự set true khi SP có giá khác category | |
| `unit` | Modal "Xem SP" | Form "Thêm SP" → "Đơn vị" | Mặc định: "ly" |
| `current_stock` | Cột "Tồn Kho" — Admin > Kho | Không nhập (tự tính) | Tăng/giảm qua inventory |
| `minimum_stock` | Cột "Ngưỡng Cảnh Báo" — Admin > Kho | Form "Thêm SP" → "Tồn kho tối thiểu" | |
| `is_active` | Badge "Đang bán / Dừng bán" — Admin > Sản phẩm | Toggle trong form/table | false → ẩn khỏi POS |
| `is_out_of_stock` | Badge "Hết hàng" trên card POS Sales | Nút toggle — Admin > Kho | Manual flag |

---

## (3.1) SERVICE_CARDS

```dbml
Table SERVICE_CARDS {
  id uuid [pk]
  card_code varchar(50) [unique, not null]      // Format: CARD001
  rfid_uid varchar(100) [unique]
  card_type enum("PHYSICAL", "QR", "NFC") [not null, default: "PHYSICAL"]
  status enum("AVAILABLE", "IN_USE", "DISABLED") [not null, default: "AVAILABLE"]
  note text
  created_at timestamp [not null]
  updated_at timestamp
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `card_code` | Số thẻ hiển thị trên grid — POS Tables | Không nhập | Seed sẵn CARD001–CARD012 |
| `rfid_uid` | Không hiển thị | Đầu đọc RFID/NFC | NULL nếu dùng thủ công |
| `card_type` | Không hiển thị | Mặc định PHYSICAL | |
| `status` | Màu thẻ: xanh=AVAILABLE, đỏ=IN_USE — POS Tables | Tự thay đổi khi check-in/out | |
| `note` | Modal "Chi tiết thẻ" | Form quản lý thẻ (Admin) | |

---

## (3.2) SERVICE_SESSIONS

```dbml
Table SERVICE_SESSIONS {
  id uuid [pk]
  session_code varchar(50) [unique, not null]   // Format: SS000001
  card_id uuid [not null]                       // FK → service_cards.id
  order_id uuid [unique, not null]              // FK → orders.id (order chính)
  created_by uuid [not null]                    // FK → users.id
  service_type enum("PACKAGE_4H", "FULLTIME") [not null]
  started_at timestamp [not null]
  expected_end_at timestamp                     // started_at + 4h nếu PACKAGE_4H
  actual_end_at timestamp                       // Khi checkout
  status enum("ACTIVE", "COMPLETED") [not null, default: "ACTIVE"]
  note text
  updated_at timestamp
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `session_code` | Không hiển thị | Không nhập | Auto gen SS000001 |
| `card_id` | Số thẻ trên grid — POS Tables | Thu ngân chọn/quét thẻ | |
| `order_id` | Không hiển thị trực tiếp | Tự gán khi tạo order | |
| `created_by` | "Nhân viên mở phiên" — Modal chi tiết | Tự set = user đang login | |
| `service_type` | Badge "4H / Cả ngày" — POS Tables | Modal check-in → chọn gói | |
| `started_at` | "Bắt đầu lúc" — POS Tables hover | Không nhập | Auto now() |
| `expected_end_at` | Countdown timer — POS Tables (4H) | Không nhập | Auto = started_at + 4h |
| `actual_end_at` | Không hiển thị | Tự set khi checkout | |
| `status` | Màu thẻ — POS Tables | Tự đổi khi check-in/checkout | |

---

## (4.1) ORDERS

```dbml
Table ORDERS {
  id uuid [pk]
  order_code varchar(50) [unique, not null]     // Logic: HCM01-YYMMDD-0001
  session_id uuid                               // FK → service_sessions.id; NULL nếu Takeaway
  created_by varchar(50) [not null]             // FK → employees.employee_id
  subtotal_amount decimal(12,2) [not null]
  discount_amount decimal(12,2) [not null, default: 0]
  tax_amount decimal(12,2) [not null, default: 0]
  total_amount decimal(12,2) [not null]
  note text
  status enum("COMPLETED", "CANCELLED") [not null]
  completed_at timestamp
  created_at timestamp [not null]
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `order_code` | Mã HĐ — Admin > Đơn hàng; Header POS Orders | Không nhập | Auto gen |
| `session_id` | Không hiển thị | Tự gán khi có session | NULL = Takeaway |
| `created_by` | "Nhân viên" — Admin > Đơn hàng | Tự set = employee đang login | |
| `subtotal_amount` | "Tổng tiền trước giảm" — POS Orders | Tự tính từ order_items | |
| `discount_amount` | Field "Giảm giá" — POS Orders checkout | Thu ngân nhập | |
| `tax_amount` | Field "Thuế" — POS Orders checkout | Tự tính hoặc nhập | |
| `total_amount` | "Tổng tiền" — POS Orders; Admin > Đơn hàng | Tự tính | subtotal - discount + tax |
| `status` | Badge "Hoàn thành / Đã hủy" — Admin > Đơn hàng | Nút "Hủy đơn" Admin | |
| `completed_at` | Cột "Thời gian" — Admin > Đơn hàng | Không nhập | Tự set khi payment |

---

## (4.2) ORDER_ITEMS

```dbml
Table ORDER_ITEMS {
  id uuid [pk]
  order_id uuid [not null]                      // FK → orders.id
  product_id uuid [not null]                    // FK → products.id
  service_type enum("TAKEAWAY", "FOUR_HOURS", "FULL_DAY") [not null]
  quantity int [not null]
  unit_price decimal(12,2) [not null]           // Chốt tại thời điểm order
  line_total decimal(12,2) [not null]           // quantity × unit_price
  note text
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `order_id` | Không hiển thị | Không nhập | FK liên kết |
| `product_id` | Tên sản phẩm — Giỏ hàng POS Sales; Chi tiết HĐ Admin | Thu ngân bấm chọn SP | |
| `service_type` | Không hiển thị trực tiếp | Tự inherit từ session/chọn Takeaway | |
| `quantity` | Số lượng — Giỏ hàng POS Sales; Chi tiết HĐ Admin | +/- trong giỏ hàng | |
| `unit_price` | "Đơn giá" — Chi tiết HĐ Admin | Không nhập | Chốt từ products |
| `line_total` | "Thành tiền" — Giỏ hàng & Chi tiết HĐ | Không nhập | Auto tính |
| `note` | "Ghi chú món" — Giỏ hàng | Thu ngân nhập ghi chú | |

---

## (4.3) PAYMENTS

```dbml
Table PAYMENTS {
  id uuid [pk]
  payment_code varchar(50) [unique, not null]   // Format: PAY20260524xxx
  order_id uuid [not null]                      // FK → orders.id
  payment_method enum("CASH", "BANK_TRANSFER") [not null]
  amount decimal(12,2) [not null]
  transfer_proof_image_url text
  paid_at timestamp
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `payment_code` | Không hiển thị | Không nhập | Auto gen |
| `order_id` | Không hiển thị | Không nhập | FK |
| `payment_method` | Nút "Tiền mặt / Chuyển khoản" — POS Orders checkout | Thu ngân chọn | |
| `amount` | "Số tiền thanh toán" — POS Orders checkout | Tự fill = total_amount | |
| `transfer_proof_image_url` | Preview ảnh QR/bill — POS Orders | Upload ảnh bill | NULL nếu tiền mặt |
| `paid_at` | Không hiển thị | Không nhập | Auto now() khi confirm |

---

## (5.1) INVENTORY_TRANSACTIONS

```dbml
Table INVENTORY_TRANSACTIONS {
  id uuid [pk]
  inven_transaction_id varchar(50) [unique, not null]  // Format: INV-YYYYMMDD-001
  transaction_type enum("IMPORT", "SALE", "ADJUSTMENT", "DAMAGE") [not null]
  reference_id uuid                             // FK mềm → orders.id khi SALE
  created_by uuid [not null]                   // FK → users.id
  note text
  created_at timestamp [not null]
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `inven_transaction_id` | Cột "Mã Tham Chiếu" — Lịch sử kho | Không nhập | Auto gen INV/EXV-date |
| `transaction_type` | Badge "Nhập kho / Xuất kho / Bán hàng" — Lịch sử kho | Xác định loại action | SALE = tự sinh khi checkout |
| `reference_id` | Không hiển thị | Không nhập | = order.id khi SALE |
| `created_by` | Cột "Nhân Viên" — Lịch sử kho | Tự set = user đang login | |
| `note` | "Ghi chú" — Modal chi tiết phiếu kho | Field textarea trong Modal nhập kho | |
| `created_at` | Cột "Thời Gian" — Lịch sử kho | Không nhập | Auto now() |

---

## (5.2) INVENTORY_ITEMS

```dbml
Table INVENTORY_ITEMS {
  id uuid [pk]
  inven_transaction_id uuid [not null]          // FK → inventory_transactions.id
  product_id uuid [not null]                    // FK → products.id
  quantity decimal(15,2) [not null]
  unit_cost decimal(15,2) [not null, default: 0]
  stock_before decimal(15,2) [not null]
  stock_after decimal(15,2) [not null]
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `inven_transaction_id` | Không hiển thị | Không nhập | FK |
| `product_id` | Cột "Sản phẩm/SKU" — Lịch sử kho; Bảng review kho | Dropdown chọn SP — Modal nhập kho | |
| `quantity` | Cột "Số Lượng" (+/-) — Lịch sử kho; Bảng nhập kho | Input số — Modal nhập kho | |
| `unit_cost` | Cột "Thành tiền" — Modal review kho | Không nhập | = products.cost_price, mặc định 0 |
| `stock_before` | Cột "Tồn kho cũ" — Modal review & Lịch sử ("5 → 0") | Không nhập | Snapshot lấy trước khi update |
| `stock_after` | Cột "Tồn kho mới" — Modal review & Lịch sử | Không nhập | stock_before ± quantity |

---

## (6) AUDIT_LOGS

```dbml
Table AUDIT_LOGS {
  id uuid [pk]
  audit_code varchar(50) [unique, not null]    // Format: AUD20260524001
  user_id uuid                                 // FK → users.id
  action enum("CREATE","UPDATE","DELETE","LOGIN","LOGOUT","APPROVE","REJECT") [not null]
  entity_type varchar(100) [not null]          // products, orders, users...
  entity_id uuid [not null]
  old_values jsonb
  new_values jsonb
  changed_fields jsonb
  action_source enum("ADMIN","POS","SYSTEM","API")
  ip_address varchar(100)
  device_info text
  note text
  created_at timestamp [not null]
}
```

| Trường | Hiển thị ở UI | Form nhập | Ghi chú |
|---|---|---|---|
| `audit_code` | Không hiển thị (dự phòng) | Không nhập | Auto gen |
| `user_id` | Không hiển thị | Tự set = user đang login | NULL nếu SYSTEM action |
| `action` | Không hiển thị (backend only) | Không nhập | Tự sinh mỗi khi có thao tác |
| `entity_type` | Không hiển thị | Không nhập | Ví dụ: "products" |
| `old_values` | Không hiển thị | Không nhập | JSON snapshot trước |
| `new_values` | Không hiển thị | Không nhập | JSON snapshot sau |
| `created_at` | Không hiển thị | Không nhập | Auto now() |

---

## Relationships

```dbml
Ref: USERS.employee_id > EMPLOYEES.employee_id
Ref: ACCOUNT_REQUESTS.employee_id > EMPLOYEES.employee_id
Ref: ACCOUNT_REQUESTS.approved_by > EMPLOYEES.employee_id
Ref: PRODUCTS.category_id > CATEGORIES.id
Ref: SERVICE_SESSIONS.card_id > SERVICE_CARDS.id
Ref: SERVICE_SESSIONS.created_by > USERS.id
Ref: SERVICE_SESSIONS.order_id - ORDERS.id
Ref: ORDERS.session_id > SERVICE_SESSIONS.id
Ref: ORDERS.created_by > EMPLOYEES.employee_id
Ref: ORDER_ITEMS.order_id > ORDERS.id
Ref: ORDER_ITEMS.product_id > PRODUCTS.id
Ref: PAYMENTS.order_id > ORDERS.id
Ref: INVENTORY_TRANSACTIONS.created_by > USERS.id
Ref: INVENTORY_ITEMS.inven_transaction_id > INVENTORY_TRANSACTIONS.id
Ref: INVENTORY_ITEMS.product_id > PRODUCTS.id
Ref: AUDIT_LOGS.user_id > USERS.id
```

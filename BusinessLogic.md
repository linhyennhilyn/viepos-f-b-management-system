H thu hồi thẻ.
* **Dữ liệu hiển thị (Read):** Đọc bảng `orders` (trạng thái `ACTIVE`) tương ứng với `card_id`, và toàn bộ `order_items` thuộc đơn đó để tính `Tổng tiền`.
* **Dữ liệu sinh ra khi Thanh Toán (Update/Create):**
  1. **Chốt Bill:** `UPDATE orders` (cập nhật `total_amount`, `discount`, `tax`, `payment_method`, và đổi `status = 'COMPLETED'`).
  2. **Thu hồi Thẻ:** `UPDATE cards` (đổi trạng thái thẻ về `AVAILABLE` để sẵn sàng gán cho khách tiếp theo).
  3. **Trừ Tồn Kho tự động:** Duyệt qua danh sách `order_items` của bill đó. Với mỗi món hàng có bật theo dõi tồn kho:
     * `INSERT INTO inventory_transactions` (`product_id`, `type = 'SALE_DEDUCTION'`, `quantity` đã bán).
     * `UPDATE products` (`current_stock = current_stock - quantity`).

### 2.5. Tab: Tài khoản của tôi (POS Account)
* **Logic & Thao tác:** Xem hồ sơ cá nhân và kết thúc ca làm việc (Đăng xuất).
* **Dữ liệu hiển thị (Read):** Đọc bảng `users` (dựa theo session hiện tại).
* **Dữ liệu sinh ra khi Đăng xuất (Update):**
  * Đóng ca: Tìm `card_sessions` đang `ACTIVE` của nhân viên đó, `UPDATE card_sessions` (lưu `logout_time`, đổi `status = 'COMPLETED'`).

---
> **Lưu ý Về Audit Log (Áp dụng chung):**
> Ở tất cả các tab, khi có bất kỳ thao tác `INSERT`, `UPDATE`, hay `DELETE` nào làm thay đổi dữ liệu quan trọng, hệ thống tự động sinh ra một record:
> * `INSERT INTO audit_logs` (lưu `user_id` người thao tác, `action` (tên hành động), `entity_type` (tên bảng), `entity_id` (ID dòng), `old_value` và `new_value` dưới dạng JSON).
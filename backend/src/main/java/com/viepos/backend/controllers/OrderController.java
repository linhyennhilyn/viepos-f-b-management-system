package com.viepos.backend.controllers;

import com.viepos.backend.models.Order;
import com.viepos.backend.models.Payment;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.OrderStatus;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.services.AuditLogService;
import com.viepos.backend.services.CheckoutPaymentValidationService;
import com.viepos.backend.services.OrderCancellationService;
import com.viepos.backend.services.OrderCheckoutService;
import com.viepos.backend.services.OrderReadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private OrderCheckoutService orderCheckoutService;

    @Autowired
    private OrderCancellationService orderCancellationService;

    @Autowired
    private CheckoutPaymentValidationService paymentValidationService;

    @Autowired
    private OrderReadService orderReadService;

    @Value("${store.code:HCM01}")
    private String storeCode;

    @GetMapping("/next-id")
    public ResponseEntity<?> getNextOrderId() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String timePart = LocalTime.now().format(DateTimeFormatter.ofPattern("HHmmss"));
        String prefix = storeCode + "-" + datePart + "-";

        // Sử dụng giờ phút giây làm chuỗi ngẫu nhiên duy nhất cho đơn hàng
        String sequence = timePart;
        String orderCode = prefix + sequence;

        return ResponseEntity.ok(Map.of(
                "orderId", orderCode,
                "displayId", sequence
        ));
    }

    /** Danh sách tóm tắt (không items, không ảnh CK) — có phân trang. */
    @GetMapping
    public ResponseEntity<?> getOrders(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        LocalDateTime from = fromDate != null
                ? LocalDate.parse(fromDate).atStartOfDay()
                : LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime to = toDate != null
                ? LocalDate.parse(toDate).atTime(23, 59, 59)
                : LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        OrderStatus orderStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                orderStatus = OrderStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        return ResponseEntity.ok(orderReadService.findOrdersPage(from, to, orderStatus, employeeId, page, size));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getRevenueStats(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate
    ) {
        LocalDateTime from = fromDate != null
                ? LocalDate.parse(fromDate).atStartOfDay()
                : LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime to = toDate != null
                ? LocalDate.parse(toDate).atTime(23, 59, 59)
                : LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        return ResponseEntity.ok(orderReadService.computeStats(from, to));
    }

    /** Chi tiết đơn — có items; minh chứng CK chỉ khi includeTransferProof=true (tránh payload base64 lớn). */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean includeTransferProof
    ) {
        return ResponseEntity.ok(orderReadService.findOrderDetail(id, includeTransferProof));
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateOrderStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        Optional<Order> orderOpt = orderRepository.findByIdForUpdate(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy đơn hàng"));
        }
        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu trạng thái đơn hàng"));
        }
        Order order = orderOpt.get();
        try {
            OrderStatus newStatus = OrderStatus.valueOf(statusStr.trim().toUpperCase());
            if (newStatus == OrderStatus.CANCELLED) {
                String note = body.get("note");
                if (note == null || note.isBlank()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập lý do hủy đơn"));
                }
                Order cancelled = orderCancellationService.cancelOrder(order, note, resolveCurrentUser());
                return ResponseEntity.ok(Map.of(
                        "message", "Đã cập nhật trạng thái đơn hàng",
                        "id", cancelled.getId(),
                        "status", cancelled.getStatus().name(),
                        "note", cancelled.getNote() != null ? cancelled.getNote() : ""
                ));
            }
            order.setStatus(newStatus);
            if (body.containsKey("note")) {
                order.setNote(body.get("note"));
            }
            orderRepository.save(order);
            return ResponseEntity.ok(Map.of(
                    "message", "Đã cập nhật trạng thái đơn hàng",
                    "id", order.getId(),
                    "status", order.getStatus().name(),
                    "note", order.getNote() != null ? order.getNote() : ""
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Trạng thái không hợp lệ"));
        }
    }

    @PostMapping("/takeaway")
    @Transactional
    public ResponseEntity<?> createTakeawayOrder(@RequestBody Map<String, Object> payload) {
        String orderCode = payload.get("orderId") != null ? payload.get("orderId").toString() : null;
        String paymentAmountStr = payload.get("paymentAmount") != null ? payload.get("paymentAmount").toString() : null;
        String pmStr = payload.get("paymentMethod") != null ? payload.get("paymentMethod").toString() : null;
        String paymentImage = payload.get("paymentImage") != null ? payload.get("paymentImage").toString() : null;

        if (orderCode == null || pmStr == null || paymentAmountStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu thông tin đơn hàng hoặc thanh toán"));
        }

        List<?> itemsObj = payload.get("items") instanceof List<?> list ? list : null;
        CheckoutPaymentValidationService.ValidatedPayment payment;
        try {
            BigDecimal serverTotal = itemsObj != null && !itemsObj.isEmpty()
                    ? orderCheckoutService.calculateItemsSubtotal(itemsObj)
                    : BigDecimal.ZERO;
            payment = paymentValidationService.validate(
                    pmStr,
                    paymentAmountStr,
                    payload.get("cashReceived") != null ? payload.get("cashReceived").toString() : null,
                    serverTotal
            );
            orderCheckoutService.validateInventoryAvailable(itemsObj);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        User currentUser = resolveCurrentUser();

        Order order = new Order();
        order.setOrderCode(orderCode);
        order.setCreatedBy(currentUser.getEmployee());
        order.setStatus(OrderStatus.COMPLETED);
        order.setSubtotalAmount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.ZERO);
        order.setCompletedAt(LocalDateTime.now());
        order = orderRepository.save(order);

        try {
            if (itemsObj != null && !itemsObj.isEmpty()) {
                orderCheckoutService.completeCheckout(order, itemsObj, currentUser, false);
                order = orderRepository.findById(order.getId()).orElse(order);
            } else {
                orderCheckoutService.auditOrderCreate(currentUser, order, List.of());
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        order.setCashReceived(payment.cashReceived());
        orderRepository.save(order);

        Payment persistedPayment = new Payment();
        persistedPayment.setPaymentCode("PAY-" + System.currentTimeMillis());
        persistedPayment.setOrder(order);
        persistedPayment.setPaymentMethod(payment.method());
        persistedPayment.setAmount(payment.paymentAmount());
        persistedPayment.setPaidAt(LocalDateTime.now());

        if (paymentImage != null && !paymentImage.isEmpty()) {
            persistedPayment.setTransferProofImageUrl(paymentImage);
        }
        paymentRepository.save(persistedPayment);

        return ResponseEntity.ok(Map.of("message", "Tạo đơn mang đi thành công", "orderId", order.getId()));
    }

    @PostMapping("/append-items")
    @Transactional
    public ResponseEntity<?> appendOrderItems(@RequestBody Map<String, Object> payload) {
        String orderCode = payload.get("orderCode") != null ? payload.get("orderCode").toString() : null;
        if (orderCode == null || orderCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu orderCode"));
        }

        Optional<Order> orderOpt = orderRepository.findByOrderCode(orderCode);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy đơn " + orderCode));
        }

        User currentUser = resolveCurrentUser();
        Order order = orderOpt.get();

        List<?> itemsObj = payload.get("items") instanceof List<?> list ? list : null;
        if (itemsObj == null || itemsObj.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu danh sách sản phẩm"));
        }

        try {
            String paymentAmountStr = payload.get("paymentAmount") != null ? payload.get("paymentAmount").toString() : null;
            String pmStr = payload.get("paymentMethod") != null ? payload.get("paymentMethod").toString() : null;
            BigDecimal addon = orderCheckoutService.calculateItemsSubtotal(itemsObj);
            CheckoutPaymentValidationService.ValidatedPayment payment = paymentValidationService.validate(
                    pmStr,
                    paymentAmountStr,
                    payload.get("cashReceived") != null ? payload.get("cashReceived").toString() : null,
                    addon
            );
            orderCheckoutService.validateInventoryAvailable(itemsObj);

            var saved = orderCheckoutService.completeCheckout(order, itemsObj, currentUser, true);
            order = orderRepository.findById(order.getId()).orElse(order);

            BigDecimal currentCash = order.getCashReceived() != null ? order.getCashReceived() : BigDecimal.ZERO;
            order.setCashReceived(currentCash.add(payment.cashReceived()));
            orderRepository.save(order);

            Payment addonPayment = new Payment();
            addonPayment.setPaymentCode("PAY-" + System.currentTimeMillis());
            addonPayment.setOrder(order);
            addonPayment.setPaymentMethod(payment.method());
            addonPayment.setAmount(payment.paymentAmount());
            addonPayment.setPaidAt(LocalDateTime.now());
            Object paymentImage = payload.get("paymentImage");
            if (paymentImage != null && !paymentImage.toString().isEmpty()) {
                addonPayment.setTransferProofImageUrl(paymentImage.toString());
            }
            paymentRepository.save(addonPayment);

            return ResponseEntity.ok(Map.of(
                    "message", "Đã thêm món vào đơn",
                    "orderId", order.getId(),
                    "itemCount", saved.size()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private User resolveCurrentUser() {
        User user = auditLogService.getCurrentUser();
        if (user != null) {
            return user;
        }
        return userRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Không có user trong hệ thống"));
    }
}

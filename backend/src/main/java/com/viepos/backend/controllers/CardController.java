package com.viepos.backend.controllers;

import com.viepos.backend.models.Order;
import com.viepos.backend.models.Payment;
import com.viepos.backend.models.ServiceCard;
import com.viepos.backend.models.ServiceSession;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.CardStatus;
import com.viepos.backend.models.enums.OrderStatus;
import com.viepos.backend.models.enums.ServiceType;
import com.viepos.backend.models.enums.SessionStatus;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.repositories.ServiceCardRepository;
import com.viepos.backend.repositories.ServiceSessionRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.services.AuditLogService;
import com.viepos.backend.services.CheckoutPaymentValidationService;
import com.viepos.backend.services.OrderCheckoutService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cards")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class CardController {

    @Autowired
    private ServiceCardRepository cardRepository;

    @Autowired
    private ServiceSessionRepository sessionRepository;

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
    private CheckoutPaymentValidationService paymentValidationService;

    @GetMapping
    public ResponseEntity<List<ServiceCard>> getAllCards() {
        return ResponseEntity.ok(cardRepository.findAll());
    }

    @GetMapping("/free")
    public ResponseEntity<List<ServiceCard>> getFreeCards() {
        return ResponseEntity.ok(cardRepository.findByStatus(CardStatus.AVAILABLE));
    }

    @PostMapping("/session")
    @Transactional
    public ResponseEntity<?> startSession(@RequestBody Map<String, Object> payload) {
        String cardNumber = payload.get("cardNumber") != null ? payload.get("cardNumber").toString() : null;
        String orderCode = payload.get("orderId") != null ? payload.get("orderId").toString() : null;
        String duration = payload.get("duration") != null ? payload.get("duration").toString() : "all_day";

        if (cardNumber == null || orderCode == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu cardNumber hoặc orderId"));
        }

        Optional<ServiceCard> cardOpt = cardRepository.findByCardCodeForUpdate(cardNumber);
        if (cardOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy thẻ có số " + cardNumber));
        }

        ServiceCard card = cardOpt.get();
        if (card.getStatus() != CardStatus.AVAILABLE) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thẻ này không trống. Trạng thái hiện tại: " + card.getStatus()));
        }
        if (sessionRepository.existsByCard_IdAndStatus(card.getId(), SessionStatus.ACTIVE)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thẻ này đang có phiên hoạt động"));
        }

        List<?> itemsObj = payload.get("items") instanceof List<?> list ? list : null;
        CheckoutPaymentValidationService.ValidatedPayment payment = null;
        try {
            BigDecimal serverTotal = itemsObj != null && !itemsObj.isEmpty()
                    ? orderCheckoutService.calculateItemsSubtotal(itemsObj)
                    : BigDecimal.ZERO;
            String pmStr = payload.get("paymentMethod") != null ? payload.get("paymentMethod").toString() : null;
            String paymentAmountStr = payload.get("paymentAmount") != null ? payload.get("paymentAmount").toString() : null;
            if (serverTotal.compareTo(BigDecimal.ZERO) > 0 || pmStr != null || paymentAmountStr != null) {
                payment = paymentValidationService.validate(
                        pmStr,
                        paymentAmountStr,
                        payload.get("cashReceived") != null ? payload.get("cashReceived").toString() : null,
                        serverTotal
                );
            }
            orderCheckoutService.validateInventoryAvailable(itemsObj);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        User currentUser = resolveCurrentUser();

        Optional<Order> existingOrder = orderRepository.findByOrderCode(orderCode);
        Order order;
        if (existingOrder.isEmpty()) {
            order = new Order();
            order.setOrderCode(orderCode);
            order.setCreatedBy(currentUser.getEmployee());
            order.setStatus(OrderStatus.COMPLETED);
            order.setSubtotalAmount(BigDecimal.ZERO);
            order.setDiscountAmount(BigDecimal.ZERO);
            order.setTaxAmount(BigDecimal.ZERO);
            order.setTotalAmount(BigDecimal.ZERO);
            order.setCompletedAt(LocalDateTime.now());
            order = orderRepository.save(order);
        } else {
            order = existingOrder.get();
        }

        card.setStatus(CardStatus.IN_USE);
        cardRepository.save(card);

        ServiceType requestedServiceType = OrderCheckoutService.resolveServiceType(duration, duration);
        boolean fourHourSession = requestedServiceType == ServiceType.PACKAGE_4H
                || requestedServiceType == ServiceType.FOUR_HOURS;
        ServiceType sType = fourHourSession ? ServiceType.PACKAGE_4H : ServiceType.FULLTIME;
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = fourHourSession
                ? startTime.plusHours(4)
                : startTime.withHour(22).withMinute(0).withSecond(0);

        ServiceSession session = new ServiceSession();
        session.setSessionCode("SS" + System.currentTimeMillis());
        session.setCard(card);
        session.setOrder(order);
        session.setCreatedBy(currentUser);
        session.setServiceType(sType);
        session.setStartedAt(startTime);
        session.setExpectedEndAt(endTime);
        session.setStatus(SessionStatus.ACTIVE);

        ServiceSession savedSession = sessionRepository.save(session);

        order.setSession(savedSession);

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

        if (payment != null) {
            order.setCashReceived(payment.cashReceived());
        }
        orderRepository.save(order);

        savePaymentIfPresent(order, payload, payment);

        return ResponseEntity.ok(savedSession);
    }

    @PostMapping("/release/{cardNumber}")
    @Transactional
    public ResponseEntity<?> releaseCard(@PathVariable String cardNumber) {
        Optional<ServiceCard> cardOpt = cardRepository.findByCardCode(cardNumber);
        if (cardOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy thẻ có số " + cardNumber));
        }

        ServiceCard card = cardOpt.get();
        card.setStatus(CardStatus.AVAILABLE);
        cardRepository.save(card);

        List<ServiceSession> activeSessions = sessionRepository.findAll().stream()
                .filter(s -> s.getCard().getCardCode().equals(cardNumber) && s.getStatus() == SessionStatus.ACTIVE)
                .collect(Collectors.toList());

        for (ServiceSession session : activeSessions) {
            session.setStatus(SessionStatus.COMPLETED);
            session.setActualEndAt(LocalDateTime.now());
            sessionRepository.save(session);
        }

        return ResponseEntity.ok(Map.of("message", "Giải phóng thẻ " + cardNumber + " thành công!"));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ServiceSession>> getAllSessions(@RequestParam(required = false) Boolean activeOnly) {
        if (Boolean.TRUE.equals(activeOnly)) {
            return ResponseEntity.ok(sessionRepository.findByStatusOrderByStartedAtDesc(SessionStatus.ACTIVE));
        }
        return ResponseEntity.ok(sessionRepository.findAll());
    }

    @PostMapping("/{cardNumber}/status")
    public ResponseEntity<?> updateCardStatus(@PathVariable String cardNumber, @RequestBody Map<String, String> payload) {
        String newStatus = payload.get("status");
        Optional<ServiceCard> cardOpt = cardRepository.findByCardCode(cardNumber);
        if (cardOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy thẻ có số " + cardNumber));
        }
        ServiceCard card = cardOpt.get();
        if ("trống".equalsIgnoreCase(newStatus) || "AVAILABLE".equalsIgnoreCase(newStatus)) {
            card.setStatus(CardStatus.AVAILABLE);
        } else if ("Đang sử dụng".equalsIgnoreCase(newStatus) || "IN_USE".equalsIgnoreCase(newStatus)) {
            card.setStatus(CardStatus.IN_USE);
        } else {
            card.setStatus(CardStatus.DISABLED);
        }
        cardRepository.save(card);
        return ResponseEntity.ok(card);
    }

    @PutMapping("/session/{cardNumber}/extend")
    public ResponseEntity<?> extendSession(@PathVariable String cardNumber, @RequestBody Map<String, String> payload) {
        String newEndTimeStr = payload.get("newEndTime");
        if (newEndTimeStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu newEndTime"));
        }

        List<ServiceSession> activeSessions = sessionRepository.findAll().stream()
                .filter(s -> s.getCard().getCardCode().equals(cardNumber) && s.getStatus() == SessionStatus.ACTIVE)
                .collect(Collectors.toList());

        if (activeSessions.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy phiên đang hoạt động cho thẻ " + cardNumber));
        }

        ServiceSession session = activeSessions.get(0);
        try {
            LocalDateTime newEndTime = LocalDateTime.parse(newEndTimeStr);
            session.setExpectedEndAt(newEndTime);

            String serviceTypeStr = payload.get("serviceType");
            if ("all_day".equalsIgnoreCase(serviceTypeStr)) {
                session.setServiceType(ServiceType.FULLTIME);
            } else if ("4h".equalsIgnoreCase(serviceTypeStr)
                    || "package_4h".equalsIgnoreCase(serviceTypeStr)) {
                session.setServiceType(ServiceType.PACKAGE_4H);
            }

            sessionRepository.save(session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Định dạng ngày giờ không hợp lệ"));
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

    private void savePaymentIfPresent(
            Order order,
            Map<String, Object> payload,
            CheckoutPaymentValidationService.ValidatedPayment validatedPayment
    ) {
        if (validatedPayment == null) {
            return;
        }
        Payment payment = new Payment();
        payment.setPaymentCode("PAY-" + System.currentTimeMillis());
        payment.setOrder(order);
        payment.setPaymentMethod(validatedPayment.method());
        payment.setAmount(validatedPayment.paymentAmount());
        payment.setPaidAt(LocalDateTime.now());

        Object paymentImage = payload.get("paymentImage");
        if (paymentImage != null && !paymentImage.toString().isEmpty()) {
            payment.setTransferProofImageUrl(paymentImage.toString());
        }
        paymentRepository.save(payment);
    }
}

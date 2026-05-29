package com.viepos.backend.controllers;

import com.viepos.backend.models.Category;
import com.viepos.backend.models.Employee;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.OrderItem;
import com.viepos.backend.models.Payment;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.ServiceCard;
import com.viepos.backend.models.ServiceSession;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.CardStatus;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.PaymentMethod;
import com.viepos.backend.models.enums.ServiceType;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.OrderItemRepository;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.ServiceCardRepository;
import com.viepos.backend.repositories.ServiceSessionRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.services.AuditLogService;
import com.viepos.backend.services.CheckoutPaymentValidationService;
import com.viepos.backend.services.OrderCheckoutService;
import com.viepos.backend.services.ProductPriceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardControllerCheckoutTotalTest {

    private CardController controller;

    @Mock
    private ServiceCardRepository cardRepository;

    @Mock
    private ServiceSessionRepository sessionRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private InventoryTransactionRepository transactionRepository;

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @Mock
    private AuditLogService auditLogService;

    private final AtomicReference<Order> savedOrder = new AtomicReference<>();
    private Product product;
    private User cashier;
    private ServiceCard card;

    @BeforeEach
    void setUp() {
        OrderCheckoutService checkoutService = new OrderCheckoutService();
        ReflectionTestUtils.setField(checkoutService, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(checkoutService, "orderItemRepository", orderItemRepository);
        ReflectionTestUtils.setField(checkoutService, "productRepository", productRepository);
        ReflectionTestUtils.setField(checkoutService, "transactionRepository", transactionRepository);
        ReflectionTestUtils.setField(checkoutService, "inventoryItemRepository", inventoryItemRepository);
        ReflectionTestUtils.setField(checkoutService, "auditLogService", auditLogService);
        ReflectionTestUtils.setField(checkoutService, "productPriceService", new ProductPriceService(productRepository));

        controller = new CardController();
        ReflectionTestUtils.setField(controller, "cardRepository", cardRepository);
        ReflectionTestUtils.setField(controller, "sessionRepository", sessionRepository);
        ReflectionTestUtils.setField(controller, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(controller, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);
        ReflectionTestUtils.setField(controller, "auditLogService", auditLogService);
        ReflectionTestUtils.setField(controller, "orderCheckoutService", checkoutService);
        ReflectionTestUtils.setField(controller, "paymentValidationService", new CheckoutPaymentValidationService());

        cashier = userWithRole(EmployeeRole.STAFF);
        lenient().when(auditLogService.getCurrentUser()).thenReturn(cashier);

        card = new ServiceCard();
        card.setId(UUID.randomUUID());
        card.setCardCode("CARD-1");
        card.setStatus(CardStatus.AVAILABLE);
        when(cardRepository.findByCardCodeForUpdate("CARD-1")).thenReturn(Optional.of(card));

        product = product(new BigDecimal("60000"), new BigDecimal("90000"), new BigDecimal("120000"));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        lenient().when(productRepository.findByIdForUpdate(product.getId())).thenReturn(Optional.of(product));
        lenient().when(orderRepository.findByOrderCode("ORDER-CARD")).thenReturn(Optional.empty());
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(UUID.randomUUID());
            }
            savedOrder.set(order);
            return order;
        });
        lenient().when(orderRepository.findById(any(UUID.class))).thenAnswer(invocation -> Optional.ofNullable(savedOrder.get()));
        lenient().when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(sessionRepository.save(any(ServiceSession.class))).thenAnswer(invocation -> {
            ServiceSession session = invocation.getArgument(0);
            if (session.getId() == null) {
                session.setId(UUID.randomUUID());
            }
            return session;
        });
    }

    @Test
    void sessionRejectsClientPaymentBelowServerTotalBeforeCreatingSession() {
        ResponseEntity<?> response = controller.startSession(sessionPayload("1", "transfer", "all_day", "120000"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(orderRepository, never()).save(any(Order.class));
        verify(cardRepository, never()).save(any(ServiceCard.class));
        verify(sessionRepository, never()).save(any(ServiceSession.class));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void sessionUsesCatalogPriceForFourHourAliasAndPaymentAmount() {
        ResponseEntity<?> response = controller.startSession(sessionPayload("90000", "transfer", "4h", "1"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(savedOrder.get().getTotalAmount()).isEqualByComparingTo("90000");

        ArgumentCaptor<OrderItem> itemCaptor = ArgumentCaptor.forClass(OrderItem.class);
        verify(orderItemRepository).save(itemCaptor.capture());
        assertThat(itemCaptor.getValue().getUnitPrice()).isEqualByComparingTo("90000");
        assertThat(itemCaptor.getValue().getLineTotal()).isEqualByComparingTo("90000");

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(paymentCaptor.getValue().getAmount()).isEqualByComparingTo("90000");
    }

    @Test
    void sessionTopLevelDurationAliasPackage4hCreatesFourHourSession() {
        ResponseEntity<?> response = controller.startSession(sessionPayload("90000", "transfer", "PACKAGE_4H", "1"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<ServiceSession> sessionCaptor = ArgumentCaptor.forClass(ServiceSession.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        assertThat(sessionCaptor.getValue().getServiceType()).isEqualTo(ServiceType.PACKAGE_4H);
        assertThat(sessionCaptor.getValue().getExpectedEndAt()).isEqualTo(sessionCaptor.getValue().getStartedAt().plusHours(4));
    }

    @Test
    void sessionTopLevelDurationAliasFourHoursCreatesFourHourSession() {
        ResponseEntity<?> response = controller.startSession(sessionPayload("90000", "transfer", "FOUR_HOURS", "1"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<ServiceSession> sessionCaptor = ArgumentCaptor.forClass(ServiceSession.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        assertThat(sessionCaptor.getValue().getServiceType()).isEqualTo(ServiceType.PACKAGE_4H);
        assertThat(sessionCaptor.getValue().getExpectedEndAt()).isEqualTo(sessionCaptor.getValue().getStartedAt().plusHours(4));
    }

    private Map<String, Object> sessionPayload(String paymentAmount, String paymentMethod, String duration, String itemPrice) {
        return Map.of(
                "cardNumber", "CARD-1",
                "orderId", "ORDER-CARD",
                "duration", duration,
                "paymentMethod", paymentMethod,
                "paymentAmount", paymentAmount,
                "items", List.of(Map.of(
                        "id", product.getId().toString(),
                        "quantity", 1,
                        "price", itemPrice,
                        "duration", duration
                ))
        );
    }

    private Product product(BigDecimal takeaway, BigDecimal package4h, BigDecimal fullDay) {
        Category category = new Category();
        category.setDefaultPriceTakeaway(takeaway);
        category.setDefaultPricePackage4h(package4h);
        category.setDefaultPricePackageFullday(fullDay);

        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setCategory(category);
        product.setName("Room Service");
        product.setIsCustomPrice(false);
        product.setPriceTakeaway(BigDecimal.ONE);
        product.setPricePackage4h(BigDecimal.ONE);
        product.setPricePackageFullday(BigDecimal.ONE);
        product.setCurrentStock(new BigDecimal("100"));
        product.setMinimumStock(BigDecimal.ZERO);
        return product;
    }

    private static User userWithRole(EmployeeRole role) {
        Employee employee = new Employee();
        employee.setEmployeeId("EMP-1");
        employee.setFullName("Cashier");
        employee.setPersonalEmail("cashier@example.test");
        employee.setPhone("0900000000");
        employee.setRole(role);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("cashier@example.test");
        user.setEmployee(employee);
        return user;
    }
}

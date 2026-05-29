package com.viepos.backend.controllers;

import com.viepos.backend.models.Category;
import com.viepos.backend.models.Employee;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.OrderItem;
import com.viepos.backend.models.Payment;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.PaymentMethod;
import com.viepos.backend.models.enums.ServiceType;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.OrderItemRepository;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.services.AuditLogService;
import com.viepos.backend.services.CheckoutPaymentValidationService;
import com.viepos.backend.services.OrderCheckoutService;
import com.viepos.backend.services.OrderReadService;
import com.viepos.backend.services.ProductPriceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.ReflectionUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderControllerCheckoutTotalTest {

    private OrderController controller;

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

    @Mock
    private OrderReadService orderReadService;

    private final AtomicReference<Order> savedOrder = new AtomicReference<>();
    private Product takeawayProduct;
    private User cashier;

    @BeforeEach
    void setUp() {
        OrderCheckoutService checkoutService = new OrderCheckoutService();
        ReflectionTestUtils.setField(checkoutService, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(checkoutService, "orderItemRepository", orderItemRepository);
        ReflectionTestUtils.setField(checkoutService, "productRepository", productRepository);
        ReflectionTestUtils.setField(checkoutService, "transactionRepository", transactionRepository);
        ReflectionTestUtils.setField(checkoutService, "inventoryItemRepository", inventoryItemRepository);
        ReflectionTestUtils.setField(checkoutService, "auditLogService", auditLogService);
        if (ReflectionUtils.findField(OrderCheckoutService.class, "productPriceService") != null) {
            ReflectionTestUtils.setField(checkoutService, "productPriceService", new ProductPriceService(productRepository));
        }

        controller = new OrderController();
        ReflectionTestUtils.setField(controller, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(controller, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);
        ReflectionTestUtils.setField(controller, "auditLogService", auditLogService);
        ReflectionTestUtils.setField(controller, "orderCheckoutService", checkoutService);
        ReflectionTestUtils.setField(controller, "paymentValidationService", new CheckoutPaymentValidationService());
        ReflectionTestUtils.setField(controller, "orderReadService", orderReadService);

        cashier = userWithRole(EmployeeRole.STAFF);
        lenient().when(auditLogService.getCurrentUser()).thenReturn(cashier);

        takeawayProduct = product(
                new BigDecimal("60000"),
                new BigDecimal("90000"),
                new BigDecimal("120000")
        );
        when(productRepository.findById(takeawayProduct.getId())).thenReturn(Optional.of(takeawayProduct));
        lenient().when(productRepository.findByIdForUpdate(takeawayProduct.getId())).thenReturn(Optional.of(takeawayProduct));
        lenient().when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            if (order.getId() == null) {
                order.setId(UUID.randomUUID());
            }
            savedOrder.set(order);
            return order;
        });
        lenient().when(orderRepository.findById(any(UUID.class))).thenAnswer(invocation -> Optional.ofNullable(savedOrder.get()));
    }

    @Test
    void takeawayIgnoresTamperedItemPriceAndPersistsCatalogPrice() {
        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload("60000", "transfer", null, "1"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<OrderItem> itemCaptor = ArgumentCaptor.forClass(OrderItem.class);
        verify(orderItemRepository).save(itemCaptor.capture());
        assertThat(itemCaptor.getValue().getUnitPrice()).isEqualByComparingTo("60000");
        assertThat(itemCaptor.getValue().getLineTotal()).isEqualByComparingTo("60000");
        assertThat(savedOrder.get().getTotalAmount()).isEqualByComparingTo("60000");
    }

    @Test
    void takeawayRejectsPaymentAmountBelowServerTotal() {
        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload("1", "transfer", null, "60000"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void takeawayRejectsTransferPaymentAmountAboveServerTotal() {
        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload("60001", "transfer", null, "60000"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void takeawayAllowsCashOverTenderButPaymentAmountRemainsServerTotal() {
        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload("60000", "cash", "100000", "60000"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(savedOrder.get().getTotalAmount()).isEqualByComparingTo("60000");
        assertThat(savedOrder.get().getCashReceived()).isEqualByComparingTo("100000");

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(paymentCaptor.getValue().getAmount()).isEqualByComparingTo("60000");
    }

    @Test
    void takeawayRejectsCashUnderTender() {
        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload("60000", "cash", "59000", "60000"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void takeawayRejectsInsufficientStockBeforeCreatingOrder() {
        takeawayProduct.setCurrentStock(BigDecimal.ZERO);

        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload("60000", "cash", "60000", "60000"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(orderRepository, never()).save(any(Order.class));
        verify(orderItemRepository, never()).save(any(OrderItem.class));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void serviceTypeAliasFulltimeUsesFullDayPrice() {
        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload(
                "120000",
                "transfer",
                null,
                "1",
                Map.of("serviceType", "FULLTIME")
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<OrderItem> itemCaptor = ArgumentCaptor.forClass(OrderItem.class);
        verify(orderItemRepository).save(itemCaptor.capture());
        assertThat(itemCaptor.getValue().getServiceType()).isEqualTo(ServiceType.FULLTIME);
        assertThat(itemCaptor.getValue().getUnitPrice()).isEqualByComparingTo("120000");
    }

    @Test
    void serviceTypeAliasFourHoursUsesPackagePrice() {
        ResponseEntity<?> response = controller.createTakeawayOrder(takeawayPayload(
                "90000",
                "transfer",
                null,
                "1",
                Map.of("serviceType", "FOUR_HOURS")
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<OrderItem> itemCaptor = ArgumentCaptor.forClass(OrderItem.class);
        verify(orderItemRepository).save(itemCaptor.capture());
        assertThat(itemCaptor.getValue().getServiceType()).isEqualTo(ServiceType.FOUR_HOURS);
        assertThat(itemCaptor.getValue().getUnitPrice()).isEqualByComparingTo("90000");
    }

    @Test
    void appendRejectsPaymentMismatchBeforeSavingAddonItems() {
        Order existingOrder = baseOrder("ORDER-APPEND-MISMATCH");
        existingOrder.setId(UUID.randomUUID());
        existingOrder.setSubtotalAmount(new BigDecimal("100000"));
        existingOrder.setTotalAmount(new BigDecimal("100000"));
        savedOrder.set(existingOrder);
        when(orderRepository.findByOrderCode("ORDER-APPEND-MISMATCH")).thenReturn(Optional.of(existingOrder));

        ResponseEntity<?> response = controller.appendOrderItems(Map.of(
                "orderCode", "ORDER-APPEND-MISMATCH",
                "paymentMethod", "transfer",
                "paymentAmount", "1",
                "items", List.of(itemPayload("60000"))
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(orderItemRepository, never()).save(any(OrderItem.class));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void appendItemsAddsServerSubtotalOnceAndPaysAddonAmount() {
        Order existingOrder = baseOrder("ORDER-APPEND");
        existingOrder.setId(UUID.randomUUID());
        existingOrder.setSubtotalAmount(new BigDecimal("100000"));
        existingOrder.setTotalAmount(new BigDecimal("100000"));
        existingOrder.setCashReceived(new BigDecimal("100000"));
        savedOrder.set(existingOrder);
        when(orderRepository.findByOrderCode("ORDER-APPEND")).thenReturn(Optional.of(existingOrder));

        ResponseEntity<?> response = controller.appendOrderItems(Map.of(
                "orderCode", "ORDER-APPEND",
                "paymentMethod", "transfer",
                "paymentAmount", "60000",
                "items", List.of(itemPayload("60000"))
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(savedOrder.get().getSubtotalAmount()).isEqualByComparingTo("160000");
        assertThat(savedOrder.get().getTotalAmount()).isEqualByComparingTo("160000");

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(paymentCaptor.getValue().getAmount()).isEqualByComparingTo("60000");
    }

    private Map<String, Object> takeawayPayload(String paymentAmount, String paymentMethod, String cashReceived, String itemPrice) {
        return takeawayPayload(paymentAmount, paymentMethod, cashReceived, itemPrice, Map.of("serveType", "takeaway"));
    }

    private Map<String, Object> takeawayPayload(
            String paymentAmount,
            String paymentMethod,
            String cashReceived,
            String itemPrice,
            Map<String, Object> itemServiceFields
    ) {
        Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("orderId", "ORDER-1");
        payload.put("paymentMethod", paymentMethod);
        payload.put("paymentAmount", paymentAmount);
        payload.put("items", List.of(itemPayload(itemPrice, itemServiceFields)));
        if (cashReceived != null) {
            payload.put("cashReceived", cashReceived);
        }
        return payload;
    }

    private Map<String, Object> itemPayload(String price) {
        return itemPayload(price, Map.of("serveType", "takeaway"));
    }

    private Map<String, Object> itemPayload(String price, Map<String, Object> serviceFields) {
        Map<String, Object> item = new java.util.LinkedHashMap<>();
        item.put("id", takeawayProduct.getId().toString());
        item.put("quantity", 1);
        item.put("price", price);
        item.putAll(serviceFields);
        return item;
    }

    private Product product(BigDecimal takeaway, BigDecimal package4h, BigDecimal fullDay) {
        Category category = new Category();
        category.setDefaultPriceTakeaway(takeaway);
        category.setDefaultPricePackage4h(package4h);
        category.setDefaultPricePackageFullday(fullDay);

        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setCategory(category);
        product.setName("Coffee");
        product.setIsCustomPrice(false);
        product.setPriceTakeaway(BigDecimal.ONE);
        product.setPricePackage4h(BigDecimal.ONE);
        product.setPricePackageFullday(BigDecimal.ONE);
        product.setCurrentStock(new BigDecimal("100"));
        product.setMinimumStock(BigDecimal.ZERO);
        return product;
    }

    private Order baseOrder(String orderCode) {
        Order order = new Order();
        order.setOrderCode(orderCode);
        order.setCreatedBy(cashier.getEmployee());
        order.setSubtotalAmount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.ZERO);
        return order;
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

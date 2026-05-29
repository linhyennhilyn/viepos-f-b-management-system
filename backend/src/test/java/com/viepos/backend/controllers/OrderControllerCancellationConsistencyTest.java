package com.viepos.backend.controllers;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.OrderStatus;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.services.AuditLogService;
import com.viepos.backend.services.CheckoutPaymentValidationService;
import com.viepos.backend.services.OrderCancellationService;
import com.viepos.backend.services.OrderCheckoutService;
import com.viepos.backend.services.OrderReadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderControllerCancellationConsistencyTest {

    private OrderController controller;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private OrderCheckoutService orderCheckoutService;

    @Mock
    private OrderCancellationService orderCancellationService;

    @Mock
    private OrderReadService orderReadService;

    private Order order;
    private User cashier;

    @BeforeEach
    void setUp() {
        controller = new OrderController();
        ReflectionTestUtils.setField(controller, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(controller, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);
        ReflectionTestUtils.setField(controller, "auditLogService", auditLogService);
        ReflectionTestUtils.setField(controller, "orderCheckoutService", orderCheckoutService);
        ReflectionTestUtils.setField(controller, "orderCancellationService", orderCancellationService);
        ReflectionTestUtils.setField(controller, "paymentValidationService", new CheckoutPaymentValidationService());
        ReflectionTestUtils.setField(controller, "orderReadService", orderReadService);

        cashier = userWithRole(EmployeeRole.STAFF);

        order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderCode("ORDER-1");
        order.setStatus(OrderStatus.COMPLETED);
        order.setSubtotalAmount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.ZERO);
        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
    }

    @Test
    void cancellationUsesLockedOrderLookupBeforeDelegating() {
        Order cancelled = new Order();
        cancelled.setId(order.getId());
        cancelled.setStatus(OrderStatus.CANCELLED);
        cancelled.setNote("Khach huy don");
        when(auditLogService.getCurrentUser()).thenReturn(cashier);
        when(orderCancellationService.cancelOrder(order, "Khach huy don", cashier)).thenReturn(cancelled);

        ResponseEntity<?> response = controller.updateOrderStatus(order.getId(), Map.of(
                "status", "CANCELLED",
                "note", "Khach huy don"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(orderRepository).findByIdForUpdate(order.getId());
        verify(orderCancellationService).cancelOrder(order, "Khach huy don", cashier);
    }

    @Test
    void cancellationRejectsBlankNoteBeforeEnteringTransactionalService() {
        ResponseEntity<?> response = controller.updateOrderStatus(order.getId(), Map.of(
                "status", "CANCELLED",
                "note", " "
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(orderCancellationService, never()).cancelOrder(any(Order.class), any(), any());
        verify(orderRepository, never()).save(any(Order.class));
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

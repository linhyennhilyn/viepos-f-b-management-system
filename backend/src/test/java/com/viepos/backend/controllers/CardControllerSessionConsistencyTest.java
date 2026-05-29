package com.viepos.backend.controllers;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.ServiceCard;
import com.viepos.backend.models.ServiceSession;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.CardStatus;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.SessionStatus;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.repositories.ServiceCardRepository;
import com.viepos.backend.repositories.ServiceSessionRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.services.AuditLogService;
import com.viepos.backend.services.CheckoutPaymentValidationService;
import com.viepos.backend.services.OrderCheckoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardControllerSessionConsistencyTest {

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
    private AuditLogService auditLogService;

    @Mock
    private OrderCheckoutService orderCheckoutService;

    private ServiceCard card;

    @BeforeEach
    void setUp() {
        controller = new CardController();
        ReflectionTestUtils.setField(controller, "cardRepository", cardRepository);
        ReflectionTestUtils.setField(controller, "sessionRepository", sessionRepository);
        ReflectionTestUtils.setField(controller, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(controller, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);
        ReflectionTestUtils.setField(controller, "auditLogService", auditLogService);
        ReflectionTestUtils.setField(controller, "orderCheckoutService", orderCheckoutService);
        ReflectionTestUtils.setField(controller, "paymentValidationService", new CheckoutPaymentValidationService());

        card = new ServiceCard();
        card.setId(UUID.randomUUID());
        card.setCardCode("CARD-1");
        card.setStatus(CardStatus.AVAILABLE);
        when(cardRepository.findByCardCodeForUpdate("CARD-1")).thenReturn(Optional.of(card));
    }

    @Test
    void startSessionRejectsExistingActiveSessionBeforeCreatingSideEffects() {
        ServiceSession activeSession = new ServiceSession();
        activeSession.setId(UUID.randomUUID());
        activeSession.setCard(card);
        activeSession.setStatus(SessionStatus.ACTIVE);
        when(sessionRepository.existsByCard_IdAndStatus(card.getId(), SessionStatus.ACTIVE))
                .thenReturn(true);

        ResponseEntity<?> response = controller.startSession(Map.of(
                "cardNumber", "CARD-1",
                "orderId", "ORDER-CARD"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(orderRepository, never()).save(any(Order.class));
        verify(cardRepository, never()).save(any(ServiceCard.class));
        verify(sessionRepository, never()).save(any(ServiceSession.class));
        verify(paymentRepository, never()).save(any());
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

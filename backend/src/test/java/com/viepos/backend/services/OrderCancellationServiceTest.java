package com.viepos.backend.services;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.InventoryItem;
import com.viepos.backend.models.InventoryTransaction;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.OrderItem;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.ServiceCard;
import com.viepos.backend.models.ServiceSession;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.CardStatus;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.OrderStatus;
import com.viepos.backend.models.enums.ServiceType;
import com.viepos.backend.models.enums.SessionStatus;
import com.viepos.backend.models.enums.TransactionType;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.OrderItemRepository;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.ServiceCardRepository;
import com.viepos.backend.repositories.ServiceSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderCancellationServiceTest {

    private OrderCancellationService service;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private InventoryTransactionRepository transactionRepository;

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @Mock
    private ServiceSessionRepository sessionRepository;

    @Mock
    private ServiceCardRepository cardRepository;

    @BeforeEach
    void setUp() {
        service = new OrderCancellationService(
                orderRepository,
                orderItemRepository,
                productRepository,
                transactionRepository,
                inventoryItemRepository,
                sessionRepository,
                cardRepository
        );
    }

    @Test
    void cancellingCompletedOrderRestocksItemsAndRecordsAdjustment() {
        User actor = userWithRole(EmployeeRole.STAFF);
        Order order = order("ORDER-1", OrderStatus.COMPLETED);
        Product product = productWithStock("2");
        OrderItem item = orderItem(order, product, 3);
        when(orderItemRepository.findByOrder_Id(order.getId())).thenReturn(List.of(item));
        when(productRepository.findByIdForUpdate(product.getId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(InventoryTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryItemRepository.save(any(InventoryItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order cancelled = service.cancelOrder(order, "Khach huy don", actor);

        assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(cancelled.getNote()).isEqualTo("Khach huy don");
        assertThat(product.getCurrentStock()).isEqualByComparingTo("5");

        ArgumentCaptor<InventoryTransaction> txCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(transactionRepository).save(txCaptor.capture());
        assertThat(txCaptor.getValue().getTransactionType()).isEqualTo(TransactionType.ADJUSTMENT);
        assertThat(txCaptor.getValue().getReferenceId()).isEqualTo(order.getId());
        assertThat(txCaptor.getValue().getCreatedBy()).isEqualTo(actor);

        ArgumentCaptor<InventoryItem> itemCaptor = ArgumentCaptor.forClass(InventoryItem.class);
        verify(inventoryItemRepository).save(itemCaptor.capture());
        assertThat(itemCaptor.getValue().getQuantity()).isEqualByComparingTo("3");
        assertThat(itemCaptor.getValue().getStockBefore()).isEqualByComparingTo("2");
        assertThat(itemCaptor.getValue().getStockAfter()).isEqualByComparingTo("5");
    }

    @Test
    void cancellingAlreadyCancelledOrderDoesNotRestockTwice() {
        Order order = order("ORDER-2", OrderStatus.CANCELLED);

        Order cancelled = service.cancelOrder(order, "Already cancelled", userWithRole(EmployeeRole.ADMIN));

        assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(orderItemRepository, never()).findByOrder_Id(any(UUID.class));
        verify(transactionRepository, never()).save(any(InventoryTransaction.class));
        verify(productRepository, never()).save(any(Product.class));
        verify(inventoryItemRepository, never()).save(any(InventoryItem.class));
    }

    @Test
    void cancellingActiveSessionOrderCompletesSessionAndReleasesCard() {
        User actor = userWithRole(EmployeeRole.STAFF);
        Order order = order("ORDER-3", OrderStatus.COMPLETED);
        ServiceCard card = new ServiceCard();
        card.setId(UUID.randomUUID());
        card.setCardCode("CARD-1");
        card.setStatus(CardStatus.IN_USE);
        ServiceSession session = new ServiceSession();
        session.setId(UUID.randomUUID());
        session.setCard(card);
        session.setOrder(order);
        session.setCreatedBy(actor);
        session.setStatus(SessionStatus.ACTIVE);
        order.setSession(session);
        when(orderItemRepository.findByOrder_Id(order.getId())).thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.cancelOrder(order, "Khach huy don", actor);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(session.getActualEndAt()).isNotNull();
        assertThat(card.getStatus()).isEqualTo(CardStatus.AVAILABLE);
        verify(sessionRepository).save(session);
        verify(cardRepository).save(card);
    }

    private static Order order(String orderCode, OrderStatus status) {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderCode(orderCode);
        order.setStatus(status);
        order.setSubtotalAmount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.ZERO);
        return order;
    }

    private static OrderItem orderItem(Order order, Product product, int quantity) {
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setServiceType(ServiceType.TAKEAWAY);
        item.setUnitPrice(BigDecimal.ONE);
        item.setLineTotal(BigDecimal.valueOf(quantity));
        return item;
    }

    private static Product productWithStock(String stock) {
        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setName("Coffee");
        product.setCurrentStock(new BigDecimal(stock));
        product.setMinimumStock(BigDecimal.ZERO);
        product.setCostPrice(BigDecimal.ZERO);
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

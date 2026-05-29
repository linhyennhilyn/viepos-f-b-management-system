package com.viepos.backend.services;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.InventoryItem;
import com.viepos.backend.models.InventoryTransaction;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.OrderItem;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.ServiceType;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.OrderItemRepository;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderCheckoutInventoryConsistencyTest {

    private OrderCheckoutService service;

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
    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        service = new OrderCheckoutService();
        ReflectionTestUtils.setField(service, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(service, "orderItemRepository", orderItemRepository);
        ReflectionTestUtils.setField(service, "productRepository", productRepository);
        ReflectionTestUtils.setField(service, "transactionRepository", transactionRepository);
        ReflectionTestUtils.setField(service, "inventoryItemRepository", inventoryItemRepository);
        ReflectionTestUtils.setField(service, "auditLogService", auditLogService);
        lenient().when(transactionRepository.save(any(InventoryTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void saleGreaterThanStockThrowsBeforeWritingInventoryTransaction() {
        Product product = productWithStock("2");
        OrderItem item = orderItem(product, 3);
        when(productRepository.findByIdForUpdate(product.getId())).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service.deductInventoryForSale(order("ORDER-1"), List.of(item), userWithRole(EmployeeRole.STAFF)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Không đủ tồn kho");

        verify(transactionRepository, never()).save(any(InventoryTransaction.class));
        verify(productRepository, never()).save(any(Product.class));
        verify(inventoryItemRepository, never()).save(any(InventoryItem.class));
    }

    @Test
    void inventoryPreflightValidationDoesNotMarkControllerTransactionRollbackOnlyOnBadRequest() throws Exception {
        Method method = OrderCheckoutService.class.getMethod("validateInventoryAvailable", List.class);
        Transactional transactional = method.getAnnotation(Transactional.class);

        assertThat(transactional.noRollbackFor()).contains(IllegalArgumentException.class);
    }

    private static Order order(String orderCode) {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderCode(orderCode);
        return order;
    }

    private static OrderItem orderItem(Product product, int quantity) {
        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setServiceType(ServiceType.TAKEAWAY);
        return item;
    }

    private static Product productWithStock(String stock) {
        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setName("Coffee");
        product.setCurrentStock(new BigDecimal(stock));
        product.setMinimumStock(BigDecimal.ZERO);
        product.setIsOutOfStock(false);
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

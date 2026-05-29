package com.viepos.backend.controllers;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.InventoryItem;
import com.viepos.backend.models.InventoryTransaction;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.UserRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryControllerConsistencyTest {

    private InventoryController controller;

    @Mock
    private InventoryTransactionRepository transactionRepository;

    @Mock
    private InventoryItemRepository itemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    private Product product;

    @BeforeEach
    void setUp() {
        controller = new InventoryController();
        ReflectionTestUtils.setField(controller, "transactionRepository", transactionRepository);
        ReflectionTestUtils.setField(controller, "itemRepository", itemRepository);
        ReflectionTestUtils.setField(controller, "productRepository", productRepository);
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);

        product = productWithStock("5");
        when(userRepository.findAll()).thenReturn(List.of(userWithRole(EmployeeRole.ADMIN)));
        when(productRepository.findByIdForUpdate(product.getId())).thenReturn(Optional.of(product));
        lenient().when(transactionRepository.save(any(InventoryTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(itemRepository.save(any(InventoryItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void lowercaseExportCreatesExportTransactionAndDecrementsStock() {
        ResponseEntity<?> response = controller.createTransaction(payload("export", "3"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(product.getCurrentStock()).isEqualByComparingTo("2");
        ArgumentCaptor<InventoryTransaction> txCaptor = ArgumentCaptor.forClass(InventoryTransaction.class);
        verify(transactionRepository).save(txCaptor.capture());
        assertThat(txCaptor.getValue().getTransactionType().name()).isEqualTo("EXPORT");
    }

    @Test
    void decrementGreaterThanStockReturnsBadRequestAndLeavesStockUnchanged() {
        ResponseEntity<?> response = controller.createTransaction(payload("damage", "6"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(product.getCurrentStock()).isEqualByComparingTo("5");
        verify(transactionRepository, never()).save(any(InventoryTransaction.class));
        verify(productRepository, never()).save(any(Product.class));
        verify(itemRepository, never()).save(any(InventoryItem.class));
    }

    private Map<String, Object> payload(String type, String quantity) {
        return Map.of(
                "type", type,
                "note", "manual stock change",
                "items", List.of(Map.of(
                        "productId", product.getId().toString(),
                        "quantity", quantity
                ))
        );
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
        employee.setFullName("Manager");
        employee.setPersonalEmail("manager@example.test");
        employee.setPhone("0900000000");
        employee.setRole(role);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("manager@example.test");
        user.setEmployee(employee);
        return user;
    }
}

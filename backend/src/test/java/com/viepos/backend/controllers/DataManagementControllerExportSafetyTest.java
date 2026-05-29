package com.viepos.backend.controllers;

import com.viepos.backend.models.Product;
import com.viepos.backend.repositories.EmployeeRepository;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.OrderItemRepository;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.ServiceSessionRepository;
import com.viepos.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataManagementControllerExportSafetyTest {

    private DataManagementController controller;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @Mock
    private ServiceSessionRepository serviceSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @BeforeEach
    void setUp() {
        controller = new DataManagementController();
        ReflectionTestUtils.setField(controller, "orderRepository", orderRepository);
        ReflectionTestUtils.setField(controller, "orderItemRepository", orderItemRepository);
        ReflectionTestUtils.setField(controller, "paymentRepository", paymentRepository);
        ReflectionTestUtils.setField(controller, "inventoryTransactionRepository", inventoryTransactionRepository);
        ReflectionTestUtils.setField(controller, "inventoryItemRepository", inventoryItemRepository);
        ReflectionTestUtils.setField(controller, "serviceSessionRepository", serviceSessionRepository);
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);
        ReflectionTestUtils.setField(controller, "productRepository", productRepository);
        ReflectionTestUtils.setField(controller, "employeeRepository", employeeRepository);
    }

    @Test
    void exportRejectsBroadDateRangesBeforeLoadingData() throws Exception {
        ResponseEntity<byte[]> response = controller.exportDataZip(
                LocalDateTime.parse("2026-01-01T00:00:00"),
                LocalDateTime.parse("2026-03-15T00:00:00")
        );

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(orderRepository, never()).findAll();
        verify(inventoryTransactionRepository, never()).findAll();
        verify(userRepository, never()).findAll();
        verify(productRepository, never()).findAll();
    }

    @Test
    void exportNeutralizesFormulaLeadingCsvValues() throws Exception {
        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setProductCode("=CODE");
        product.setName("+SUM(1,2)");
        product.setCreatedAt(LocalDateTime.parse("2026-01-02T00:00:00"));
        product.setPriceTakeaway(new BigDecimal("1000"));
        product.setCurrentStock(BigDecimal.ONE);
        product.setIsActive(true);
        LocalDateTime start = LocalDateTime.parse("2026-01-01T00:00:00");
        LocalDateTime end = LocalDateTime.parse("2026-01-03T00:00:00");
        when(orderRepository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(start, end)).thenReturn(List.of());
        when(inventoryTransactionRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end)).thenReturn(List.of());
        when(userRepository.findByCreatedAtBetweenWithEmployee(start, end)).thenReturn(List.of());
        when(productRepository.findByCreatedAtBetween(start, end)).thenReturn(List.of(product));

        ResponseEntity<byte[]> response = controller.exportDataZip(start, end);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        String productsCsv = unzipEntry(response.getBody(), "products_export.csv");
        assertThat(productsCsv).contains("\"'=CODE\"");
        assertThat(productsCsv).contains("\"'+SUM(1,2)\"");
    }

    private static String unzipEntry(byte[] zipBytes, String filename) throws Exception {
        try (ZipInputStream zis = new ZipInputStream(new java.io.ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (filename.equals(entry.getName())) {
                    return new String(zis.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                }
            }
        }
        throw new AssertionError("Missing ZIP entry " + filename);
    }
}

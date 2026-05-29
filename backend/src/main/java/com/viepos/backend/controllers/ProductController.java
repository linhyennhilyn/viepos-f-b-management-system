package com.viepos.backend.controllers;

import com.viepos.backend.models.Product;
import com.viepos.backend.models.Category;
import com.viepos.backend.models.enums.AuditAction;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.CategoryRepository;
import com.viepos.backend.services.AuditLogService;
import com.viepos.backend.services.ProductPriceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private ProductPriceService productPriceService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllProducts() {
        List<Map<String, Object>> result = productRepository.findActiveWithCategory().stream()
                .map(this::toProductListDto)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** DTO danh sách — không trả description (TEXT lớn). */
    private Map<String, Object> toProductListDto(Product product) {
        Map<String, Object> effective = productPriceService.effectivePrices(product);
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", product.getId());
        dto.put("productCode", product.getProductCode());
        dto.put("sku", product.getSku());
        dto.put("name", product.getName());
        dto.put("shortName", product.getShortName());
        dto.put("imageUrl", product.getImageUrl());
        dto.put("costPrice", product.getCostPrice());
        dto.put("priceTakeaway", effective.get("priceTakeaway"));
        dto.put("pricePackage4h", effective.get("pricePackage4h"));
        dto.put("pricePackageFullday", effective.get("pricePackageFullday"));
        dto.put("isCustomPrice", product.getIsCustomPrice());
        dto.put("servicePriceUpdatedAt", product.getServicePriceUpdatedAt());
        dto.put("unit", product.getUnit());
        dto.put("currentStock", product.getCurrentStock());
        dto.put("minimumStock", product.getMinimumStock());
        dto.put("isActive", product.getIsActive());
        dto.put("isOutOfStock", product.getIsOutOfStock());
        dto.put("preparationTime", product.getPreparationTime());
        if (product.getCategory() != null) {
            dto.put("categoryId", product.getCategory().getId());
            dto.put("categoryName", product.getCategory().getName());
        }
        return dto;
    }

    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody java.util.Map<String, Object> payload) {
        Product product = new Product();
        boolean servicePriceChanged = mapPayloadToProduct(payload, product);

        if (product.getProductCode() == null || product.getProductCode().isEmpty()) {
            long count = productRepository.count() + 1;
            product.setProductCode(String.format("PRD%04d", count));
        }
        product.setIsActive(true);
        product.setIsOutOfStock(false);
        if (servicePriceChanged && product.getServicePriceUpdatedAt() == null) {
            product.setServicePriceUpdatedAt(LocalDateTime.now());
        }
        Product savedProduct = productRepository.save(product);
        auditLogService.log(auditLogService.getCurrentUser(), AuditAction.CREATE, "products", savedProduct.getId(), null, savedProduct);
        return ResponseEntity.ok(savedProduct);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable java.util.UUID id, @RequestBody java.util.Map<String, Object> payload) {
        Optional<Product> productOpt = productRepository.findById(id);
        if (productOpt.isEmpty()) {
            return ResponseEntity.status(404).body(java.util.Map.of("message", "Product not found"));
        }

        Product product = productOpt.get();
        Product beforeUpdate = new Product(product.getId(), product.getProductCode(), product.getSku(), product.getCategory(), product.getName(), product.getShortName(), product.getDescription(), product.getImageUrl(), product.getCostPrice(), product.getPriceTakeaway(), product.getPricePackage4h(), product.getPricePackageFullday(), product.getIsCustomPrice(), product.getServicePriceUpdatedAt(), product.getUnit(), product.getCurrentStock(), product.getMinimumStock(), product.getIsActive(), product.getIsOutOfStock(), product.getPreparationTime(), product.getCreatedAt(), product.getUpdatedAt());
        boolean servicePriceChanged = mapPayloadToProduct(payload, product);
        if (servicePriceChanged) {
            product.setServicePriceUpdatedAt(LocalDateTime.now());
        }
        Product savedProduct = productRepository.save(product);
        auditLogService.log(auditLogService.getCurrentUser(), AuditAction.UPDATE, "products", savedProduct.getId(), beforeUpdate, savedProduct);
        return ResponseEntity.ok(savedProduct);
    }

    private boolean mapPayloadToProduct(java.util.Map<String, Object> payload, Product product) {
        boolean servicePriceChanged = false;
        if (payload.containsKey("name")) product.setName((String) payload.get("name"));
        if (payload.containsKey("shortName")) product.setShortName((String) payload.get("shortName"));
        if (payload.containsKey("sku")) product.setSku((String) payload.get("sku"));
        
        if (payload.containsKey("categoryId")) {
            java.util.UUID catId = java.util.UUID.fromString((String) payload.get("categoryId"));
            Category cat = categoryRepository.findById(catId).orElse(null);
            if (cat != null) product.setCategory(cat);
        }
        
        if (payload.containsKey("costPrice")) {
            product.setCostPrice(new java.math.BigDecimal(payload.get("costPrice").toString()));
        }
        if (payload.containsKey("isCustomPrice")) {
            product.setIsCustomPrice((Boolean) payload.get("isCustomPrice"));
            servicePriceChanged = true;
        }
        boolean customPrice = Boolean.TRUE.equals(product.getIsCustomPrice());
        if (customPrice) {
            if (payload.containsKey("priceTakeaway")) {
                product.setPriceTakeaway(new java.math.BigDecimal(payload.get("priceTakeaway").toString()));
                servicePriceChanged = true;
            }
            if (payload.containsKey("pricePackage4h")) {
                product.setPricePackage4h(new java.math.BigDecimal(payload.get("pricePackage4h").toString()));
                servicePriceChanged = true;
            }
            if (payload.containsKey("pricePackageFullday")) {
                product.setPricePackageFullday(new java.math.BigDecimal(payload.get("pricePackageFullday").toString()));
                servicePriceChanged = true;
            }
        }
        if (payload.containsKey("status")) {
            product.setIsActive("Đang bán".equals(payload.get("status")));
        } else if (payload.containsKey("isActive")) {
            product.setIsActive((Boolean) payload.get("isActive"));
        }
        if (payload.containsKey("unit")) {
            product.setUnit((String) payload.get("unit"));
        }
        if (payload.containsKey("currentStock")) {
            product.setCurrentStock(new java.math.BigDecimal(payload.get("currentStock").toString()));
        }
        if (payload.containsKey("minimumStock")) {
            product.setMinimumStock(new java.math.BigDecimal(payload.get("minimumStock").toString()));
        }

        if (product.getCategory() != null && !Boolean.TRUE.equals(product.getIsCustomPrice())) {
            productPriceService.applyCategoryPrices(product, product.getCategory());
            servicePriceChanged = true;
        }
        return servicePriceChanged;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable java.util.UUID id) {
        Optional<Product> productOpt = productRepository.findById(id);
        if (productOpt.isEmpty()) {
            return ResponseEntity.status(404).body(java.util.Map.of("message", "Product not found"));
        }

        Product product = productOpt.get();
        Product beforeDelete = new Product(product.getId(), product.getProductCode(), product.getSku(), product.getCategory(), product.getName(), product.getShortName(), product.getDescription(), product.getImageUrl(), product.getCostPrice(), product.getPriceTakeaway(), product.getPricePackage4h(), product.getPricePackageFullday(), product.getIsCustomPrice(), product.getServicePriceUpdatedAt(), product.getUnit(), product.getCurrentStock(), product.getMinimumStock(), product.getIsActive(), product.getIsOutOfStock(), product.getPreparationTime(), product.getCreatedAt(), product.getUpdatedAt());
        product.setIsActive(false); // Soft delete
        Product savedProduct = productRepository.save(product);
        auditLogService.log(auditLogService.getCurrentUser(), AuditAction.DELETE, "products", savedProduct.getId(), beforeDelete, null);

        return ResponseEntity.ok(java.util.Map.of("message", "Product deleted successfully"));
    }
}

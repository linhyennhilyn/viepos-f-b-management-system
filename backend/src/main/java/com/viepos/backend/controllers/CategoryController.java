package com.viepos.backend.controllers;

import com.viepos.backend.models.Category;
import com.viepos.backend.repositories.CategoryRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.services.ProductPriceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductPriceService productPriceService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCategories() {
        List<Category> categories = categoryRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
        List<UUID> categoryIds = categories.stream().map(Category::getId).toList();
        Map<UUID, Long> productCounts = productRepository.countActiveProductsByCategoryIdsMap(categoryIds);

        List<Map<String, Object>> result = categories.stream().map(cat -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", cat.getId());
            dto.put("categoryCode", cat.getCategoryCode());
            dto.put("name", cat.getName());
            dto.put("description", cat.getDescription());
            dto.put("imageUrl", cat.getImageUrl());
            dto.put("defaultPriceTakeaway", cat.getDefaultPriceTakeaway());
            dto.put("defaultPricePackage4h", cat.getDefaultPricePackage4h());
            dto.put("defaultPricePackageFullday", cat.getDefaultPricePackageFullday());
            dto.put("displayOrder", cat.getDisplayOrder());
            dto.put("isActive", cat.getIsActive());
            dto.put("createdAt", cat.getCreatedAt());
            dto.put("updatedAt", cat.getUpdatedAt());
            dto.put("productCount", productCounts.getOrDefault(cat.getId(), 0L));
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> createCategory(@RequestBody Category category) {
        // Check for duplicate name
        String name = category.getName() != null ? category.getName().trim().toUpperCase() : "";
        if (name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên danh mục không được để trống"));
        }
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Danh mục \"" + name + "\" đã tồn tại"));
        }
        if (category.getCategoryCode() == null || category.getCategoryCode().isEmpty()) {
            long count = categoryRepository.count() + 1;
            category.setCategoryCode(String.format("CAT%04d", count));
        }
        category.setName(name);
        category.setIsActive(true);
        Category savedCategory = categoryRepository.save(category);
        return ResponseEntity.ok(savedCategory);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        Optional<Category> categoryOpt = categoryRepository.findById(id);
        if (categoryOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Category not found"));
        }

        Category category = categoryOpt.get();

        if (body.containsKey("name")) {
            String newName = body.get("name").toString().trim().toUpperCase();
            // Check for duplicate name, excluding the current category
            Optional<Category> existing = categoryRepository.findByNameIgnoreCase(newName);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Danh mục \"" + newName + "\" đã tồn tại"));
            }
            category.setName(newName);
        }
        if (body.containsKey("description")) {
            category.setDescription(body.get("description") != null ? body.get("description").toString() : null);
        }
        if (body.containsKey("defaultPriceTakeaway")) {
            category.setDefaultPriceTakeaway(new java.math.BigDecimal(body.get("defaultPriceTakeaway").toString()));
        }
        if (body.containsKey("defaultPricePackage4h")) {
            category.setDefaultPricePackage4h(new java.math.BigDecimal(body.get("defaultPricePackage4h").toString()));
        }
        if (body.containsKey("defaultPricePackageFullday")) {
            category.setDefaultPricePackageFullday(new java.math.BigDecimal(body.get("defaultPricePackageFullday").toString()));
        }
        if (body.containsKey("displayOrder")) {
            category.setDisplayOrder(Integer.parseInt(body.get("displayOrder").toString()));
        }

        boolean priceChanged = body.containsKey("defaultPriceTakeaway")
                || body.containsKey("defaultPricePackage4h")
                || body.containsKey("defaultPricePackageFullday");

        Category saved = categoryRepository.save(category);
        if (priceChanged) {
            productPriceService.syncNonCustomProductsInCategory(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable UUID id) {
        Optional<Category> categoryOpt = categoryRepository.findById(id);
        if (categoryOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Category not found"));
        }

        Category category = categoryOpt.get();

        // Find or create "KHÁC" fallback category
        List<com.viepos.backend.models.Product> products = productRepository.findByCategory_Id(id);
        if (!products.isEmpty()) {
            Optional<Category> khacOpt = categoryRepository.findByNameIgnoreCase("KHÁC");
            Category khac;
            if (khacOpt.isPresent()) {
                khac = khacOpt.get();
            } else {
                khac = new Category();
                khac.setCategoryCode("CAT-KHAC");
                khac.setName("KHÁC");
                khac.setIsActive(true);
                khac.setDefaultPriceTakeaway(java.math.BigDecimal.ZERO);
                khac.setDefaultPricePackage4h(java.math.BigDecimal.ZERO);
                khac.setDefaultPricePackageFullday(java.math.BigDecimal.ZERO);
                khac = categoryRepository.save(khac);
            }
            // Move all products to KHÁC
            for (com.viepos.backend.models.Product p : products) {
                p.setCategory(khac);
                if (!Boolean.TRUE.equals(p.getIsCustomPrice())) {
                    p.setPriceTakeaway(khac.getDefaultPriceTakeaway());
                    p.setPricePackage4h(khac.getDefaultPricePackage4h());
                    p.setPricePackageFullday(khac.getDefaultPricePackageFullday());
                }
            }
            productRepository.saveAll(products);
        }

        // Soft delete the category
        category.setIsActive(false);
        categoryRepository.save(category);

        return ResponseEntity.ok(Map.of(
            "message", "Đã xóa danh mục thành công. " + products.size() + " sản phẩm đã được chuyển sang KHÁC."
        ));
    }
}

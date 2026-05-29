package com.viepos.backend.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_code", unique = true, nullable = false, length = 50)
    private String productCode;

    @Column(unique = true, length = 100)
    private String sku;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String name;

    @Column(name = "short_name", length = 100)
    private String shortName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "cost_price", nullable = false)
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "price_takeaway", nullable = false)
    private BigDecimal priceTakeaway = BigDecimal.ZERO;

    @Column(name = "price_package_4h", nullable = false)
    private BigDecimal pricePackage4h = BigDecimal.ZERO;

    @Column(name = "price_package_fullday", nullable = false)
    private BigDecimal pricePackageFullday = BigDecimal.ZERO;

    @Column(name = "is_custom_price", nullable = false)
    private Boolean isCustomPrice = false;

    @Column(name = "service_price_updated_at")
    private LocalDateTime servicePriceUpdatedAt;

    @Column(nullable = false, length = 50)
    private String unit = "ly";

    @Column(name = "current_stock", nullable = false)
    private BigDecimal currentStock = BigDecimal.ZERO;

    @Column(name = "minimum_stock", nullable = false)
    private BigDecimal minimumStock = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "is_out_of_stock", nullable = false)
    private Boolean isOutOfStock = false;

    @Column(name = "preparation_time")
    private Integer preparationTime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

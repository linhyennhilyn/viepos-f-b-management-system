package com.viepos.backend.repositories;

import com.viepos.backend.models.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") UUID id);

    Optional<Product> findByProductCode(String productCode);
    Optional<Product> findBySku(String sku);
    List<Product> findByCategory_Id(UUID categoryId);
    List<Product> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.isActive = true ORDER BY p.name")
    List<Product> findActiveWithCategory();

    List<Product> findByIsActiveTrue();
    boolean existsBySku(String sku);
    boolean existsByNameIgnoreCase(String name);

    @Query("""
            SELECT p.category.id, COUNT(p) FROM Product p
            WHERE p.category.id IN :categoryIds AND p.isActive = true
            GROUP BY p.category.id
            """)
    List<Object[]> countActiveProductsByCategoryIds(@Param("categoryIds") List<UUID> categoryIds);

    default Map<UUID, Long> countActiveProductsByCategoryIdsMap(List<UUID> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return Map.of();
        }
        return countActiveProductsByCategoryIds(categoryIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));
    }
}

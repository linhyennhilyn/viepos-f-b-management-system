package com.viepos.backend.repositories;

import com.viepos.backend.models.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {
    List<InventoryItem> findByInventoryTransaction_Id(UUID inventoryTransactionId);
    List<InventoryItem> findByProduct_Id(UUID productId);

    @Query("""
            SELECT ii FROM InventoryItem ii
            JOIN FETCH ii.product p
            LEFT JOIN FETCH p.category
            WHERE ii.inventoryTransaction.id IN :transactionIds
            """)
    List<InventoryItem> findByInventoryTransaction_IdInWithProduct(
            @Param("transactionIds") Collection<UUID> transactionIds
    );

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM InventoryItem ii WHERE ii.inventoryTransaction.id IN :transactionIds")
    void deleteByInventoryTransactionIdIn(@Param("transactionIds") Collection<UUID> transactionIds);
}

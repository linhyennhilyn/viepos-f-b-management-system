package com.viepos.backend.repositories;

import com.viepos.backend.models.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.viepos.backend.models.enums.TransactionType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, UUID> {
    Optional<InventoryTransaction> findByInvenTransactionId(String invenTransactionId);

    List<InventoryTransaction> findByCreatedAtBetweenOrderByCreatedAtDesc(
            LocalDateTime from,
            LocalDateTime to
    );

    List<InventoryTransaction> findByCreatedAtBetweenAndTransactionTypeOrderByCreatedAtDesc(
            LocalDateTime from,
            LocalDateTime to,
            TransactionType type
    );

    @Query("SELECT MIN(it.createdAt) FROM InventoryTransaction it")
    LocalDateTime findEarliestCreatedAt();

    @Query("SELECT MAX(it.createdAt) FROM InventoryTransaction it")
    LocalDateTime findLatestCreatedAt();

    @Query("SELECT it.id FROM InventoryTransaction it WHERE it.createdAt BETWEEN :from AND :to")
    List<UUID> findIdsByCreatedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM InventoryTransaction it WHERE it.createdAt BETWEEN :from AND :to")
    void deleteByCreatedAtBetween(@org.springframework.data.repository.query.Param("from") LocalDateTime from, @org.springframework.data.repository.query.Param("to") LocalDateTime to);
}

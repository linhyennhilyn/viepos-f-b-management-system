package com.viepos.backend.repositories;

import com.viepos.backend.models.Order;
import com.viepos.backend.models.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByOrderCode(String orderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.session sess LEFT JOIN FETCH sess.card WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") UUID id);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);
    List<Order> findBySession_Id(UUID sessionId);
    List<Order> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);

    long countByOrderCodeStartingWithAndCreatedAtBetween(
            String orderCodePrefix,
            LocalDateTime startDate,
            LocalDateTime endDate
    );

    Page<Order> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to, Pageable pageable);
    List<Order> findAllByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to);

    Page<Order> findByCreatedAtBetweenAndStatus(
            LocalDateTime from,
            LocalDateTime to,
            OrderStatus status,
            Pageable pageable
    );

    Page<Order> findByCreatedAtBetweenAndCreatedBy_EmployeeId(
            LocalDateTime from,
            LocalDateTime to,
            String employeeId,
            Pageable pageable
    );

    Page<Order> findByCreatedAtBetweenAndStatusAndCreatedBy_EmployeeId(
            LocalDateTime from,
            LocalDateTime to,
            OrderStatus status,
            String employeeId,
            Pageable pageable
    );

    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.createdBy
            WHERE o.id IN :ids
            """)
    List<Order> findByIdInWithCreatedBy(@Param("ids") Collection<UUID> ids);

    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.session sess
            LEFT JOIN FETCH sess.card
            WHERE o.id IN :ids
            """)
    List<Order> findByIdInWithSession(@Param("ids") Collection<UUID> ids);

    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.session
            WHERE o.createdAt BETWEEN :from AND :to
              AND o.status = :status
            ORDER BY o.createdAt DESC
            """)
    List<Order> findCompletedBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("status") OrderStatus status
    );

    @Query("SELECT o.id FROM Order o WHERE o.createdAt BETWEEN :from AND :to")
    List<UUID> findIdsByCreatedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT MIN(o.createdAt) FROM Order o")
    LocalDateTime findEarliestCreatedAt();

    @Query("SELECT MAX(o.createdAt) FROM Order o")
    LocalDateTime findLatestCreatedAt();

    @Modifying
    @Query("UPDATE Order o SET o.session = null WHERE o.createdAt BETWEEN :from AND :to")
    void clearSessionReferences(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Modifying
    @Query("DELETE FROM Order o WHERE o.createdAt BETWEEN :from AND :to")
    void deleteByCreatedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}

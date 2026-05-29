package com.viepos.backend.repositories;

import com.viepos.backend.dto.PaymentSummaryRow;
import com.viepos.backend.models.Payment;
import com.viepos.backend.models.enums.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;
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
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByPaymentCode(String paymentCode);
    Optional<Payment> findByOrder_Id(UUID orderId);
    List<Payment> findAllByOrder_Id(UUID orderId);

    @Query("""
            SELECT new com.viepos.backend.dto.PaymentSummaryRow(
                p.order.id, p.paymentMethod, p.amount, p.paidAt
            )
            FROM Payment p
            WHERE p.order.id IN :orderIds
            ORDER BY p.paidAt ASC
            """)
    List<PaymentSummaryRow> findSummariesByOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);

    @Query("""
            SELECT DISTINCT p.order.id FROM Payment p
            WHERE p.order.id IN :orderIds
              AND p.paymentMethod = :method
              AND p.transferProofImageUrl IS NOT NULL
              AND LENGTH(p.transferProofImageUrl) > 0
            """)
    List<UUID> findOrderIdsWithTransferProof(
            @Param("orderIds") Collection<UUID> orderIds,
            @Param("method") PaymentMethod method
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Payment p
            SET p.transferProofImageUrl = NULL
            WHERE p.transferProofImageUrl IS NOT NULL
              AND p.paymentMethod = :method
              AND p.paidAt IS NOT NULL
              AND p.paidAt < :cutoff
            """)
    int clearExpiredTransferProofs(
            @Param("cutoff") LocalDateTime cutoff,
            @Param("method") PaymentMethod method
    );

    long countByPaymentMethodAndTransferProofImageUrlIsNotNullAndPaidAtBefore(
            PaymentMethod paymentMethod,
            LocalDateTime cutoff
    );

    @Modifying
    @Query("DELETE FROM Payment p WHERE p.order.id IN :orderIds")
    void deleteByOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);
}

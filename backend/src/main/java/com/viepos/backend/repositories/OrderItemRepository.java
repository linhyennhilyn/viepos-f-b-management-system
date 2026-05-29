package com.viepos.backend.repositories;

import com.viepos.backend.dto.OrderItemCountRow;
import com.viepos.backend.models.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    List<OrderItem> findByOrder_Id(UUID orderId);

    @Query("""
            SELECT oi FROM OrderItem oi
            JOIN FETCH oi.product p
            LEFT JOIN FETCH p.category
            WHERE oi.order.id IN :orderIds
            """)
    List<OrderItem> findByOrder_IdInWithProduct(@Param("orderIds") Collection<UUID> orderIds);

    @Query("""
            SELECT new com.viepos.backend.dto.OrderItemCountRow(oi.order.id, COUNT(oi))
            FROM OrderItem oi
            WHERE oi.order.id IN :orderIds
            GROUP BY oi.order.id
            """)
    List<OrderItemCountRow> countItemsByOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);

    @Modifying
    @Query("DELETE FROM OrderItem oi WHERE oi.order.id IN :orderIds")
    void deleteByOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);
}

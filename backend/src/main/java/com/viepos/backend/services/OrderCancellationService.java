package com.viepos.backend.services;

import com.viepos.backend.models.InventoryItem;
import com.viepos.backend.models.InventoryTransaction;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.OrderItem;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.ServiceCard;
import com.viepos.backend.models.ServiceSession;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.CardStatus;
import com.viepos.backend.models.enums.OrderStatus;
import com.viepos.backend.models.enums.SessionStatus;
import com.viepos.backend.models.enums.TransactionType;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.OrderItemRepository;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.ServiceCardRepository;
import com.viepos.backend.repositories.ServiceSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderCancellationService {

    private record RestockLine(Product product, BigDecimal quantity, BigDecimal stockBefore, BigDecimal stockAfter) {
    }

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final ServiceSessionRepository sessionRepository;
    private final ServiceCardRepository cardRepository;

    public OrderCancellationService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ProductRepository productRepository,
            InventoryTransactionRepository transactionRepository,
            InventoryItemRepository inventoryItemRepository,
            ServiceSessionRepository sessionRepository,
            ServiceCardRepository cardRepository
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.transactionRepository = transactionRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.sessionRepository = sessionRepository;
        this.cardRepository = cardRepository;
    }

    @Transactional
    public Order cancelOrder(Order order, String note, User actor) {
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return order;
        }
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập lý do hủy đơn");
        }
        if (actor == null) {
            throw new IllegalArgumentException("Không xác định được người hủy đơn");
        }

        List<OrderItem> items = orderItemRepository.findByOrder_Id(order.getId());
        List<RestockLine> restockLines = prepareRestockLines(items);
        if (!restockLines.isEmpty()) {
            InventoryTransaction transaction = new InventoryTransaction();
            transaction.setInvenTransactionId("CANCEL-" + order.getOrderCode() + "-" + System.currentTimeMillis());
            transaction.setTransactionType(TransactionType.ADJUSTMENT);
            transaction.setReferenceId(order.getId());
            transaction.setCreatedBy(actor);
            transaction.setNote("Hoàn tồn kho từ đơn " + order.getOrderCode());
            transaction = transactionRepository.save(transaction);

            for (RestockLine line : restockLines) {
                Product product = line.product();
                product.setCurrentStock(line.stockAfter());
                BigDecimal minimum = product.getMinimumStock() != null ? product.getMinimumStock() : BigDecimal.ZERO;
                product.setIsOutOfStock(line.stockAfter().compareTo(minimum) <= 0);
                productRepository.save(product);

                InventoryItem item = new InventoryItem();
                item.setInventoryTransaction(transaction);
                item.setProduct(product);
                item.setQuantity(line.quantity());
                item.setUnitCost(product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO);
                item.setStockBefore(line.stockBefore());
                item.setStockAfter(line.stockAfter());
                inventoryItemRepository.save(item);
            }
        }

        completeActiveSession(order.getSession());
        order.setStatus(OrderStatus.CANCELLED);
        order.setNote(note);
        return orderRepository.save(order);
    }

    private List<RestockLine> prepareRestockLines(List<OrderItem> items) {
        Map<UUID, Product> products = lockProducts(items.stream()
                .filter(item -> item.getProduct() != null && item.getProduct().getId() != null)
                .map(item -> item.getProduct().getId())
                .toList());
        Map<UUID, BigDecimal> runningStocks = new LinkedHashMap<>();

        return items.stream()
                .filter(item -> item.getProduct() != null && item.getProduct().getId() != null)
                .map(item -> {
                    UUID productId = item.getProduct().getId();
                    Product product = products.get(productId);
                    BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());
                    BigDecimal stockBefore = runningStocks.getOrDefault(
                            productId,
                            product.getCurrentStock() != null ? product.getCurrentStock() : BigDecimal.ZERO
                    );
                    BigDecimal stockAfter = stockBefore.add(quantity);
                    runningStocks.put(productId, stockAfter);
                    return new RestockLine(product, quantity, stockBefore, stockAfter);
                })
                .toList();
    }

    private Map<UUID, Product> lockProducts(Collection<UUID> productIds) {
        Map<UUID, Product> products = new LinkedHashMap<>();
        productIds.stream()
                .distinct()
                .sorted()
                .forEach(id -> products.put(id, productRepository.findByIdForUpdate(id)
                        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm: " + id))));
        return products;
    }

    private void completeActiveSession(ServiceSession session) {
        if (session == null || session.getStatus() != SessionStatus.ACTIVE) {
            return;
        }
        session.setStatus(SessionStatus.COMPLETED);
        session.setActualEndAt(LocalDateTime.now());
        sessionRepository.save(session);

        ServiceCard card = session.getCard();
        if (card != null) {
            card.setStatus(CardStatus.AVAILABLE);
            cardRepository.save(card);
        }
    }
}

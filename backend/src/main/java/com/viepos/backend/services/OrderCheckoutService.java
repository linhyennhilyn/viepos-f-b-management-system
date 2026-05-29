package com.viepos.backend.services;

import com.viepos.backend.models.*;
import com.viepos.backend.models.enums.AuditAction;
import com.viepos.backend.models.enums.ServiceType;
import com.viepos.backend.models.enums.TransactionType;
import com.viepos.backend.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class OrderCheckoutService {

    private record PreparedStockDeduction(Product product, BigDecimal quantity, BigDecimal stockBefore, BigDecimal stockAfter) {
    }

    private record StockRequest(UUID productId, BigDecimal quantity) {
    }

    public static class ParsedLineItem {
        private UUID productId;
        private int quantity;
        private String note;
        private ServiceType serviceType;

        public UUID getProductId() { return productId; }
        public void setProductId(UUID productId) { this.productId = productId; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
        public ServiceType getServiceType() { return serviceType; }
        public void setServiceType(ServiceType serviceType) { this.serviceType = serviceType; }
    }

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private ProductPriceService productPriceService;

    public List<ParsedLineItem> parseItems(List<?> itemsObj) {
        List<ParsedLineItem> result = new ArrayList<>();
        if (itemsObj == null) {
            return result;
        }
        for (Object itemObj : itemsObj) {
            if (!(itemObj instanceof Map<?, ?> itemMap)) {
                continue;
            }
            String productIdStr = firstNonBlank(
                    asString(itemMap.get("id")),
                    asString(itemMap.get("productId"))
            );
            if (productIdStr == null || productIdStr.isEmpty()) {
                continue;
            }
            UUID productId;
            try {
                productId = UUID.fromString(productIdStr);
            } catch (IllegalArgumentException e) {
                continue;
            }

            int quantity = itemMap.get("quantity") != null
                    ? Integer.parseInt(itemMap.get("quantity").toString())
                    : 1;
            if (quantity <= 0) {
                continue;
            }

            ParsedLineItem line = new ParsedLineItem();
            line.setProductId(productId);
            line.setQuantity(quantity);
            line.setNote(asString(itemMap.get("note")));
            line.setServiceType(resolveServiceType(
                    asString(itemMap.get("serviceType")),
                    asString(itemMap.get("serveType")),
                    asString(itemMap.get("duration"))
            ));
            result.add(line);
        }
        return result;
    }

    public static ServiceType resolveServiceType(String serviceType, String serveType, String duration) {
        ServiceType fromServiceType = resolveServiceAlias(serviceType);
        if (fromServiceType != null) {
            return fromServiceType;
        }
        ServiceType fromServeType = resolveServiceAlias(serveType);
        if (fromServeType != null) {
            return fromServeType;
        }
        ServiceType fromDuration = resolveServiceAlias(duration);
        if (fromDuration != null) {
            return fromDuration;
        }
        return ServiceType.TAKEAWAY;
    }

    public static ServiceType resolveServiceType(String serveType, String duration) {
        return resolveServiceType(null, serveType, duration);
    }

    private static ServiceType resolveServiceAlias(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "TAKEAWAY", "TAKE_AWAY", "MANG_DI" -> ServiceType.TAKEAWAY;
            case "PACKAGE_4H" -> ServiceType.PACKAGE_4H;
            case "4H", "FOUR_HOURS" -> ServiceType.FOUR_HOURS;
            case "FULLTIME", "FULL_TIME" -> ServiceType.FULLTIME;
            case "ALL_DAY", "FULL_DAY" -> ServiceType.FULL_DAY;
            default -> null;
        };
    }

    public BigDecimal calculateItemsSubtotal(List<?> itemsObj) {
        List<ParsedLineItem> parsed = parseItems(itemsObj);
        BigDecimal linesSubtotal = BigDecimal.ZERO;
        for (ParsedLineItem line : parsed) {
            Product product = productRepository.findById(line.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy sản phẩm: " + line.getProductId()));
            BigDecimal unitPrice = productPriceService.priceFor(product, line.getServiceType());
            linesSubtotal = linesSubtotal.add(unitPrice.multiply(BigDecimal.valueOf(line.getQuantity())));
        }
        return linesSubtotal;
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void validateInventoryAvailable(List<?> itemsObj) {
        prepareStockDeductions(parseItems(itemsObj).stream()
                .map(line -> new StockRequest(line.getProductId(), BigDecimal.valueOf(line.getQuantity())))
                .toList());
    }

    @Transactional
    public List<OrderItem> saveOrderItems(Order order, List<?> itemsObj, boolean appendTotals) {
        List<ParsedLineItem> parsed = parseItems(itemsObj);
        List<OrderItem> saved = new ArrayList<>();
        BigDecimal linesSubtotal = BigDecimal.ZERO;

        for (ParsedLineItem line : parsed) {
            Product product = productRepository.findById(line.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy sản phẩm: " + line.getProductId()));

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(line.getQuantity());
            BigDecimal unitPrice = productPriceService.priceFor(product, line.getServiceType());
            orderItem.setUnitPrice(unitPrice);
            orderItem.setLineTotal(unitPrice.multiply(BigDecimal.valueOf(line.getQuantity())));
            orderItem.setServiceType(line.getServiceType());
            orderItem.setNote(line.getNote());

            saved.add(orderItemRepository.save(orderItem));
            linesSubtotal = linesSubtotal.add(orderItem.getLineTotal());
        }

        if (!saved.isEmpty()) {
            if (appendTotals) {
                BigDecimal currentSub = order.getSubtotalAmount() != null ? order.getSubtotalAmount() : BigDecimal.ZERO;
                order.setSubtotalAmount(currentSub.add(linesSubtotal));
                BigDecimal currentTotal = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
                order.setTotalAmount(currentTotal.add(linesSubtotal));
            } else {
                order.setSubtotalAmount(linesSubtotal);
                order.setTotalAmount(linesSubtotal);
            }
            if (order.getCompletedAt() == null) {
                order.setCompletedAt(LocalDateTime.now());
            }
            orderRepository.save(order);
        }

        return saved;
    }

    @Transactional
    public void deductInventoryForSale(Order order, List<OrderItem> items, User actor) {
        if (items == null || items.isEmpty()) {
            return;
        }
        User createdBy = actor != null ? actor : auditLogService.getCurrentUser();
        if (createdBy == null) {
            return;
        }

        List<PreparedStockDeduction> preparedDeductions = prepareStockDeductions(items.stream()
                .filter(item -> item.getProduct() != null && item.getProduct().getId() != null)
                .map(item -> new StockRequest(item.getProduct().getId(), BigDecimal.valueOf(item.getQuantity())))
                .toList());

        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setInvenTransactionId("SALE-" + order.getOrderCode() + "-" + System.currentTimeMillis());
        transaction.setTransactionType(TransactionType.SALE);
        transaction.setReferenceId(order.getId());
        transaction.setCreatedBy(createdBy);
        transaction.setNote("Trừ tồn kho từ đơn " + order.getOrderCode());
        transaction = transactionRepository.save(transaction);

        for (PreparedStockDeduction deduction : preparedDeductions) {
            Product product = deduction.product();
            product.setCurrentStock(deduction.stockAfter());
            BigDecimal minimum = product.getMinimumStock() != null ? product.getMinimumStock() : BigDecimal.ZERO;
            product.setIsOutOfStock(deduction.stockAfter().compareTo(minimum) <= 0);
            productRepository.save(product);

            InventoryItem invItem = new InventoryItem();
            invItem.setInventoryTransaction(transaction);
            invItem.setProduct(product);
            invItem.setQuantity(deduction.quantity());
            invItem.setUnitCost(product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO);
            invItem.setStockBefore(deduction.stockBefore());
            invItem.setStockAfter(deduction.stockAfter());
            inventoryItemRepository.save(invItem);
        }
    }

    private List<PreparedStockDeduction> prepareStockDeductions(List<StockRequest> requests) {
        Map<UUID, Product> lockedProducts = lockProducts(requests.stream()
                .map(StockRequest::productId)
                .toList());
        Map<UUID, BigDecimal> runningStocks = new LinkedHashMap<>();
        List<PreparedStockDeduction> prepared = new ArrayList<>();

        for (StockRequest request : requests) {
            UUID productId = request.productId();
            Product product = lockedProducts.get(productId);
            BigDecimal qty = request.quantity();
            BigDecimal stockBefore = runningStocks.getOrDefault(
                    productId,
                    product.getCurrentStock() != null ? product.getCurrentStock() : BigDecimal.ZERO
            );
            BigDecimal stockAfter = stockBefore.subtract(qty);
            if (stockAfter.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Không đủ tồn kho cho sản phẩm " + product.getName());
            }
            runningStocks.put(productId, stockAfter);
            prepared.add(new PreparedStockDeduction(product, qty, stockBefore, stockAfter));
        }

        return prepared;
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

    public void auditOrderCreate(User actor, Order order, List<OrderItem> items) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("orderCode", order.getOrderCode());
        snapshot.put("status", order.getStatus() != null ? order.getStatus().name() : null);
        snapshot.put("subtotalAmount", order.getSubtotalAmount());
        snapshot.put("totalAmount", order.getTotalAmount());
        snapshot.put("itemCount", items != null ? items.size() : 0);
        auditLogService.log(actor, AuditAction.CREATE, "orders", order.getId(), null, snapshot);
    }

    public List<OrderItem> completeCheckout(Order order, List<?> itemsObj, User actor, boolean appendTotals) {
        List<OrderItem> saved = saveOrderItems(order, itemsObj, appendTotals);
        if (!saved.isEmpty()) {
            deductInventoryForSale(order, saved, actor);
        }
        auditOrderCreate(actor, order, saved);
        return saved;
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }
}

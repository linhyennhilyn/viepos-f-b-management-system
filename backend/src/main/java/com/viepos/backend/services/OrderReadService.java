package com.viepos.backend.services;

import com.viepos.backend.dto.OrderItemCountRow;
import com.viepos.backend.dto.PaymentSummaryRow;
import com.viepos.backend.models.Order;
import com.viepos.backend.models.OrderItem;
import com.viepos.backend.models.Payment;
import com.viepos.backend.models.enums.OrderStatus;
import com.viepos.backend.models.enums.PaymentMethod;
import com.viepos.backend.repositories.OrderItemRepository;
import com.viepos.backend.repositories.OrderRepository;
import com.viepos.backend.repositories.PaymentRepository;
import com.viepos.backend.util.ApiDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderReadService {

    private static final int MAX_PAGE_SIZE = 500;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;

    public OrderReadService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            PaymentRepository paymentRepository
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
    }

    public Map<String, Object> findOrdersPage(
            LocalDateTime from,
            LocalDateTime to,
            OrderStatus status,
            String employeeId,
            int page,
            int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> orderPage = findOrdersPageInternal(from, to, status, blankToNull(employeeId), pageable);

        List<Order> orders = orderPage.getContent();
        if (orders.isEmpty()) {
            return pageEnvelope(orderPage, List.of());
        }

        List<UUID> orderIds = orders.stream().map(Order::getId).toList();
        Map<UUID, Order> withRelations = loadOrdersWithRelations(orderIds);

        Map<UUID, List<PaymentSummaryRow>> paymentsByOrder = groupPayments(
                paymentRepository.findSummariesByOrderIdIn(orderIds)
        );
        Set<UUID> ordersWithProof = new HashSet<>(
                paymentRepository.findOrderIdsWithTransferProof(orderIds, PaymentMethod.BANK_TRANSFER)
        );
        Map<UUID, Long> itemCounts = orderItemRepository.countItemsByOrderIdIn(orderIds).stream()
                .collect(Collectors.toMap(OrderItemCountRow::orderId, OrderItemCountRow::itemCount));

        List<Map<String, Object>> content = orders.stream()
                .map(o -> toListDto(withRelations.getOrDefault(o.getId(), o), paymentsByOrder, ordersWithProof, itemCounts))
                .collect(Collectors.toList());

        return pageEnvelope(orderPage, content);
    }

    public Map<String, Object> findOrderDetail(UUID id) {
        return findOrderDetail(id, true);
    }

    /** @param includeTransferProof false = không tải ảnh CK (base64 lớn) — dùng cho POS Trang chủ */
    public Map<String, Object> findOrderDetail(UUID id, boolean includeTransferProof) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        order = loadOrdersWithRelations(List.of(id)).getOrDefault(id, order);

        List<OrderItem> items = orderItemRepository.findByOrder_IdInWithProduct(List.of(id));
        List<PaymentSummaryRow> paymentSummaries = paymentRepository.findSummariesByOrderIdIn(List.of(id));
        Set<UUID> ordersWithProof = new HashSet<>(
                paymentRepository.findOrderIdsWithTransferProof(List.of(id), PaymentMethod.BANK_TRANSFER)
        );

        Map<String, Object> dto = toListDto(
                order,
                Map.of(id, paymentSummaries),
                ordersWithProof,
                Map.of(id, (long) items.size())
        );
        dto.put("items", items.stream().map(this::toItemDto).collect(Collectors.toList()));

        if (includeTransferProof) {
            List<Payment> payments = paymentRepository.findAllByOrder_Id(id);
            String transferProofUrl = resolveTransferProofImageUrl(payments);
            if (transferProofUrl != null) {
                dto.put("transfer_proof_image_url", transferProofUrl);
                dto.put("transferProofImageUrl", transferProofUrl);
            }
        }
        return dto;
    }

    public Map<String, Object> computeStats(LocalDateTime from, LocalDateTime to) {
        List<Order> completed = orderRepository.findCompletedBetween(from, to, OrderStatus.COMPLETED);
        if (completed.isEmpty()) {
            return emptyStats(from, to);
        }

        List<UUID> orderIds = completed.stream().map(Order::getId).toList();
        Map<UUID, List<PaymentSummaryRow>> paymentsByOrder = groupPayments(
                paymentRepository.findSummariesByOrderIdIn(orderIds)
        );
        List<OrderItem> allItems = orderItemRepository.findByOrder_IdInWithProduct(orderIds);
        Map<UUID, List<OrderItem>> itemsByOrder = allItems.stream()
                .collect(Collectors.groupingBy(i -> i.getOrder().getId()));

        BigDecimal totalRevenue = completed.stream()
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalOrders = completed.size();
        BigDecimal avgOrder = totalOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        ChartBundle chart = buildChartBundle(completed, from, to);
        List<Map<String, Object>> chartData = chart.data();
        String chartGranularity = chart.granularity();

        Map<String, BigDecimal> revenueByType = new LinkedHashMap<>();
        Map<String, Long> ordersByType = new LinkedHashMap<>();
        revenueByType.put("FULLTIME", BigDecimal.ZERO);
        revenueByType.put("PACKAGE_4H", BigDecimal.ZERO);
        revenueByType.put("TAKEAWAY", BigDecimal.ZERO);
        ordersByType.put("FULLTIME", 0L);
        ordersByType.put("PACKAGE_4H", 0L);
        ordersByType.put("TAKEAWAY", 0L);

        BigDecimal cashAmount = BigDecimal.ZERO;
        BigDecimal transferAmount = BigDecimal.ZERO;
        long cashOrderCount = 0;
        long transferOrderCount = 0;

        for (Order o : completed) {
            String typeKey = resolveOrderTypeKey(o, itemsByOrder.getOrDefault(o.getId(), List.of()));
            BigDecimal amount = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            revenueByType.merge(typeKey, amount, BigDecimal::add);
            ordersByType.merge(typeKey, 1L, Long::sum);

            List<PaymentSummaryRow> payments = paymentsByOrder.getOrDefault(o.getId(), List.of());
            if (payments.isEmpty()) {
                cashAmount = cashAmount.add(amount);
                cashOrderCount++;
                continue;
            }
            for (PaymentSummaryRow p : payments) {
                BigDecimal amt = p.amount() != null ? p.amount() : BigDecimal.ZERO;
                if (p.paymentMethod() == PaymentMethod.BANK_TRANSFER) {
                    transferAmount = transferAmount.add(amt);
                } else {
                    cashAmount = cashAmount.add(amt);
                }
            }
            boolean hasTransfer = payments.stream().anyMatch(p -> p.paymentMethod() == PaymentMethod.BANK_TRANSFER);
            if (hasTransfer) {
                transferOrderCount++;
            } else {
                cashOrderCount++;
            }
        }

        BigDecimal paymentTotal = cashAmount.add(transferAmount);
        int cashPercent = paymentTotal.compareTo(BigDecimal.ZERO) > 0
                ? cashAmount.multiply(BigDecimal.valueOf(100)).divide(paymentTotal, 0, RoundingMode.HALF_UP).intValue()
                : 0;
        int transferPercent = paymentTotal.compareTo(BigDecimal.ZERO) > 0 ? 100 - cashPercent : 0;

        Map<String, BigDecimal> productRevMap = new HashMap<>();
        Map<String, Long> productQtyMap = new HashMap<>();
        Map<String, String> productSkuMap = new HashMap<>();
        Map<String, String> productCatMap = new HashMap<>();
        Map<String, String> productUnitMap = new HashMap<>();

        for (OrderItem item : allItems) {
            if (item.getProduct() == null) continue;
            String name = item.getProduct().getName();
            productRevMap.merge(name, item.getLineTotal(), BigDecimal::add);
            productQtyMap.merge(name, (long) item.getQuantity(), Long::sum);
            productSkuMap.put(name, item.getProduct().getSku() != null ? item.getProduct().getSku() : "--");
            productCatMap.put(name, item.getProduct().getCategory() != null ? item.getProduct().getCategory().getName() : "--");
            productUnitMap.put(name, item.getProduct().getUnit() != null ? item.getProduct().getUnit() : "ly");
        }

        List<Map<String, Object>> topProducts = productRevMap.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", e.getKey());
                    m.put("sku", productSkuMap.get(e.getKey()));
                    m.put("category", productCatMap.get(e.getKey()));
                    m.put("revenue", e.getValue());
                    m.put("qty", productQtyMap.get(e.getKey()));
                    m.put("unit", productUnitMap.get(e.getKey()));
                    return m;
                }).collect(Collectors.toList());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRevenue", totalRevenue);
        stats.put("totalOrders", totalOrders);
        stats.put("avgOrderValue", avgOrder);
        stats.put("chartGranularity", chartGranularity);
        stats.put("chartData", chartData);
        stats.put("hourlyData", chartGranularity.equals("hour") ? chartData : List.of());
        stats.put("dailyData", chartGranularity.equals("day") ? chartData : List.of());
        stats.put("revenueByType", revenueByType);
        stats.put("ordersByType", ordersByType);
        stats.put("fullDayOrders", ordersByType.getOrDefault("FULLTIME", 0L));
        stats.put("package4hOrders", ordersByType.getOrDefault("PACKAGE_4H", 0L));
        stats.put("takeawayOrders", ordersByType.getOrDefault("TAKEAWAY", 0L));
        stats.put("cashPercent", cashPercent);
        stats.put("transferPercent", transferPercent);
        stats.put("cashOrderCount", cashOrderCount);
        stats.put("transferOrderCount", transferOrderCount);
        stats.put("cashAmount", cashAmount);
        stats.put("transferAmount", transferAmount);
        stats.put("topProducts", topProducts);
        return stats;
    }

    public long countOrdersTodayWithPrefix(String prefix, LocalDateTime startOfDay, LocalDateTime endOfDay) {
        return orderRepository.countByOrderCodeStartingWithAndCreatedAtBetween(prefix, startOfDay, endOfDay);
    }

    /** Tránh `? IS NULL` trong JPQL — PostgreSQL không suy ra kiểu tham số. */
    private Page<Order> findOrdersPageInternal(
            LocalDateTime from,
            LocalDateTime to,
            OrderStatus status,
            String employeeId,
            Pageable pageable
    ) {
        if (status != null && employeeId != null) {
            return orderRepository.findByCreatedAtBetweenAndStatusAndCreatedBy_EmployeeId(
                    from, to, status, employeeId, pageable);
        }
        if (status != null) {
            return orderRepository.findByCreatedAtBetweenAndStatus(from, to, status, pageable);
        }
        if (employeeId != null) {
            return orderRepository.findByCreatedAtBetweenAndCreatedBy_EmployeeId(from, to, employeeId, pageable);
        }
        return orderRepository.findByCreatedAtBetween(from, to, pageable);
    }

    /**
     * Nạp employee + session/card theo từng query — tránh lỗi multi JOIN FETCH và 404 ảo.
     */
    private Map<UUID, Order> loadOrdersWithRelations(Collection<UUID> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Order> map = new LinkedHashMap<>();
        for (Order o : orderRepository.findAllById(orderIds)) {
            map.put(o.getId(), o);
        }
        for (Order o : orderRepository.findByIdInWithCreatedBy(orderIds)) {
            Order existing = map.get(o.getId());
            if (existing != null) {
                existing.setCreatedBy(o.getCreatedBy());
            } else {
                map.put(o.getId(), o);
            }
        }
        for (Order o : orderRepository.findByIdInWithSession(orderIds)) {
            Order existing = map.get(o.getId());
            if (existing != null) {
                existing.setSession(o.getSession());
            } else {
                map.put(o.getId(), o);
            }
        }
        return map;
    }

    private Map<String, Object> toListDto(
            Order order,
            Map<UUID, List<PaymentSummaryRow>> paymentsByOrder,
            Set<UUID> ordersWithProof,
            Map<UUID, Long> itemCounts
    ) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", order.getId());
        dto.put("orderCode", order.getOrderCode());
        dto.put("status", order.getStatus().name());
        dto.put("totalAmount", order.getTotalAmount());
        dto.put("subtotalAmount", order.getSubtotalAmount());
        dto.put("discountAmount", order.getDiscountAmount());
        dto.put("cashReceived", order.getCashReceived());
        dto.put("note", order.getNote());
        dto.put("createdAt", ApiDateTime.toVietnamOffset(order.getCreatedAt()));
        dto.put("completedAt", ApiDateTime.toVietnamOffset(order.getCompletedAt()));
        dto.put("itemCount", itemCounts.getOrDefault(order.getId(), 0L));

        if (order.getCreatedBy() != null) {
            dto.put("employeeId", order.getCreatedBy().getEmployeeId());
            dto.put("employeeName", order.getCreatedBy().getFullName());
        }

        if (order.getSession() != null) {
            dto.put("sessionType", order.getSession().getServiceType().name());
            if (order.getSession().getCard() != null) {
                dto.put("cardCode", order.getSession().getCard().getCardCode());
            }
        }

        List<PaymentSummaryRow> payments = paymentsByOrder.getOrDefault(order.getId(), List.of());
        if (!payments.isEmpty()) {
            PaymentSummaryRow last = payments.get(payments.size() - 1);
            dto.put("paymentMethod", last.paymentMethod().name());
            dto.put("paymentAmount", payments.stream()
                    .map(PaymentSummaryRow::amount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
        }
        dto.put("hasTransferProof", ordersWithProof.contains(order.getId()));
        return dto;
    }

    private Map<String, Object> toItemDto(OrderItem item) {
        Map<String, Object> iDto = new LinkedHashMap<>();
        iDto.put("id", item.getId());
        iDto.put("serviceType", item.getServiceType().name());
        iDto.put("quantity", item.getQuantity());
        iDto.put("unitPrice", item.getUnitPrice());
        iDto.put("lineTotal", item.getLineTotal());
        iDto.put("note", item.getNote());
        if (item.getProduct() != null) {
            iDto.put("productId", item.getProduct().getId());
            iDto.put("productName", item.getProduct().getName());
            iDto.put("productSku", item.getProduct().getSku());
            if (item.getProduct().getCategory() != null) {
                iDto.put("categoryName", item.getProduct().getCategory().getName());
            }
        }
        return iDto;
    }

    private PaymentSummaryRow toPaymentSummary(Payment p) {
        return new PaymentSummaryRow(
                p.getOrder().getId(),
                p.getPaymentMethod(),
                p.getAmount(),
                p.getPaidAt()
        );
    }

    private Map<UUID, List<PaymentSummaryRow>> groupPayments(List<PaymentSummaryRow> rows) {
        return rows.stream().collect(Collectors.groupingBy(PaymentSummaryRow::orderId));
    }

    private static Map<String, Object> pageEnvelope(Page<Order> page, List<Map<String, Object>> content) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", content);
        result.put("page", page.getNumber());
        result.put("size", page.getSize());
        result.put("totalElements", page.getTotalElements());
        result.put("totalPages", page.getTotalPages());
        return result;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private static boolean hasTransferProof(List<Payment> payments) {
        return payments.stream()
                .anyMatch(p -> p.getPaymentMethod() == PaymentMethod.BANK_TRANSFER
                        && p.getTransferProofImageUrl() != null
                        && !p.getTransferProofImageUrl().isBlank());
    }

    public static String resolveTransferProofImageUrl(List<Payment> payments) {
        return payments.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.BANK_TRANSFER)
                .filter(p -> p.getTransferProofImageUrl() != null && !p.getTransferProofImageUrl().isBlank())
                .reduce((first, second) -> second)
                .map(Payment::getTransferProofImageUrl)
                .orElse(null);
    }

    private String resolveOrderTypeKey(Order order, List<OrderItem> items) {
        if (order.getSession() != null && order.getSession().getServiceType() != null) {
            return normalizeServiceTypeKey(order.getSession().getServiceType().name());
        }
        if (items.isEmpty()) {
            return "TAKEAWAY";
        }
        Map<String, Long> counts = new HashMap<>();
        for (OrderItem item : items) {
            String key = item.getServiceType() != null
                    ? normalizeServiceTypeKey(item.getServiceType().name())
                    : "TAKEAWAY";
            counts.merge(key, 1L, Long::sum);
        }
        return counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("TAKEAWAY");
    }

    private static String normalizeServiceTypeKey(String raw) {
        if (raw == null) return "TAKEAWAY";
        return switch (raw) {
            case "PACKAGE_4H", "FOUR_HOURS" -> "PACKAGE_4H";
            case "FULLTIME", "FULL_DAY" -> "FULLTIME";
            default -> "TAKEAWAY";
        };
    }

    private List<Map<String, Object>> buildHourlyChartData(List<Order> completed) {
        Map<Integer, BigDecimal> revenueByHour = new TreeMap<>();
        Map<Integer, Long> ordersByHour = new TreeMap<>();
        for (int h = 7; h <= 23; h++) {
            revenueByHour.put(h, BigDecimal.ZERO);
            ordersByHour.put(h, 0L);
        }
        for (Order o : completed) {
            if (o.getCreatedAt() == null) continue;
            int hour = o.getCreatedAt().getHour();
            if (!revenueByHour.containsKey(hour)) {
                revenueByHour.put(hour, BigDecimal.ZERO);
                ordersByHour.put(hour, 0L);
            }
            BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            revenueByHour.merge(hour, amt, BigDecimal::add);
            ordersByHour.merge(hour, 1L, Long::sum);
        }
        return revenueByHour.entrySet().stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("time", String.format("%02d", e.getKey()));
            m.put("tooltipLabel", String.format("%02d:00", e.getKey()));
            m.put("revenue", e.getValue());
            m.put("orders", ordersByHour.get(e.getKey()));
            return m;
        }).collect(Collectors.toList());
    }

    private record ChartBundle(String granularity, List<Map<String, Object>> data) {}

    private ChartBundle buildChartBundle(List<Order> completed, LocalDateTime from, LocalDateTime to) {
        LocalDate fromDate = from.toLocalDate();
        LocalDate toDate = to.toLocalDate();
        long daysBetween = ChronoUnit.DAYS.between(fromDate, toDate);
        if (daysBetween == 0) {
            return new ChartBundle("hour", buildHourlyChartData(completed));
        }
        if (daysBetween > 31) {
            return new ChartBundle("month", buildMonthlyChartData(completed, fromDate, toDate));
        }
        return new ChartBundle("day", buildDailyChartData(completed, fromDate, toDate));
    }

    private List<Map<String, Object>> buildMonthlyChartData(List<Order> completed, LocalDate from, LocalDate to) {
        Map<YearMonth, BigDecimal> revenueByMonth = new LinkedHashMap<>();
        Map<YearMonth, Long> ordersByMonth = new LinkedHashMap<>();
        YearMonth cursor = YearMonth.from(from);
        YearMonth end = YearMonth.from(to);
        while (!cursor.isAfter(end)) {
            revenueByMonth.put(cursor, BigDecimal.ZERO);
            ordersByMonth.put(cursor, 0L);
            cursor = cursor.plusMonths(1);
        }
        for (Order o : completed) {
            if (o.getCreatedAt() == null) continue;
            YearMonth ym = YearMonth.from(o.getCreatedAt());
            if (!revenueByMonth.containsKey(ym)) {
                revenueByMonth.put(ym, BigDecimal.ZERO);
                ordersByMonth.put(ym, 0L);
            }
            BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            revenueByMonth.merge(ym, amt, BigDecimal::add);
            ordersByMonth.merge(ym, 1L, Long::sum);
        }
        return revenueByMonth.entrySet().stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            int month = e.getKey().getMonthValue();
            m.put("time", "T" + month);
            m.put("tooltipLabel", String.format("Tháng %d/%d", month, e.getKey().getYear()));
            m.put("revenue", e.getValue());
            m.put("orders", ordersByMonth.get(e.getKey()));
            return m;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildDailyChartData(List<Order> completed, LocalDate from, LocalDate to) {
        Map<LocalDate, BigDecimal> revenueByDay = new LinkedHashMap<>();
        Map<LocalDate, Long> ordersByDay = new LinkedHashMap<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            revenueByDay.put(cursor, BigDecimal.ZERO);
            ordersByDay.put(cursor, 0L);
            cursor = cursor.plusDays(1);
        }
        for (Order o : completed) {
            if (o.getCreatedAt() == null) continue;
            LocalDate day = o.getCreatedAt().toLocalDate();
            if (!revenueByDay.containsKey(day)) {
                revenueByDay.put(day, BigDecimal.ZERO);
                ordersByDay.put(day, 0L);
            }
            BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            revenueByDay.merge(day, amt, BigDecimal::add);
            ordersByDay.merge(day, 1L, Long::sum);
        }
        DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("dd/MM");
        return revenueByDay.entrySet().stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("time", e.getKey().format(labelFmt));
            m.put("tooltipLabel", e.getKey().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            m.put("revenue", e.getValue());
            m.put("orders", ordersByDay.get(e.getKey()));
            return m;
        }).collect(Collectors.toList());
    }

    private Map<String, Object> emptyStats(LocalDateTime from, LocalDateTime to) {
        ChartBundle chart = buildChartBundle(List.of(), from, to);
        String chartGranularity = chart.granularity();
        List<Map<String, Object>> chartData = chart.data();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRevenue", BigDecimal.ZERO);
        stats.put("totalOrders", 0);
        stats.put("avgOrderValue", BigDecimal.ZERO);
        stats.put("chartGranularity", chartGranularity);
        stats.put("chartData", chartData);
        stats.put("hourlyData", chartGranularity.equals("hour") ? chartData : List.of());
        stats.put("dailyData", chartGranularity.equals("day") ? chartData : List.of());
        stats.put("revenueByType", Map.of("FULLTIME", BigDecimal.ZERO, "PACKAGE_4H", BigDecimal.ZERO, "TAKEAWAY", BigDecimal.ZERO));
        stats.put("ordersByType", Map.of("FULLTIME", 0L, "PACKAGE_4H", 0L, "TAKEAWAY", 0L));
        stats.put("fullDayOrders", 0L);
        stats.put("package4hOrders", 0L);
        stats.put("takeawayOrders", 0L);
        stats.put("cashPercent", 0);
        stats.put("transferPercent", 0);
        stats.put("cashOrderCount", 0L);
        stats.put("transferOrderCount", 0L);
        stats.put("cashAmount", BigDecimal.ZERO);
        stats.put("transferAmount", BigDecimal.ZERO);
        stats.put("topProducts", List.of());
        return stats;
    }
}

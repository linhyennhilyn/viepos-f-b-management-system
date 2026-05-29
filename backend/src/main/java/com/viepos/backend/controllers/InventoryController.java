package com.viepos.backend.controllers;

import com.viepos.backend.models.InventoryItem;
import com.viepos.backend.models.InventoryTransaction;
import com.viepos.backend.models.Product;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.TransactionType;
import com.viepos.backend.repositories.InventoryItemRepository;
import com.viepos.backend.repositories.InventoryTransactionRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class InventoryController {

    private record ParsedInventoryLine(UUID productId, BigDecimal quantity) {
    }

    private record PreparedInventoryLine(Product product, BigDecimal quantity, BigDecimal stockBefore, BigDecimal stockAfter) {
    }

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    @Autowired
    private InventoryItemRepository itemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String type
    ) {
        LocalDateTime from = fromDate != null && !fromDate.isEmpty()
                ? LocalDate.parse(fromDate).atStartOfDay()
                : LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime to = toDate != null && !toDate.isEmpty()
                ? LocalDate.parse(toDate).atTime(23, 59, 59)
                : LocalDateTime.now().plusYears(10);

        List<InventoryTransaction> transactions;
        if (type != null && !type.isEmpty() && !type.equals("ALL")) {
            try {
                TransactionType txType = TransactionType.valueOf(type.toUpperCase());
                transactions = transactionRepository.findByCreatedAtBetweenAndTransactionTypeOrderByCreatedAtDesc(
                        from, to, txType
                );
            } catch (IllegalArgumentException e) {
                transactions = transactionRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(from, to);
            }
        } else {
            transactions = transactionRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(from, to);
        }

        if (transactions.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<UUID> txIds = transactions.stream().map(InventoryTransaction::getId).toList();
        Map<UUID, List<InventoryItem>> itemsByTx = itemRepository
                .findByInventoryTransaction_IdInWithProduct(txIds).stream()
                .collect(Collectors.groupingBy(i -> i.getInventoryTransaction().getId()));

        List<Map<String, Object>> result = transactions.stream().map(t -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", t.getId());
            dto.put("transactionCode", t.getInvenTransactionId());
            dto.put("transactionType", t.getTransactionType().name());
            dto.put("note", t.getNote());
            dto.put("createdAt", t.getCreatedAt());
            dto.put("referenceId", t.getReferenceId());

            if (t.getCreatedBy() != null) {
                Map<String, Object> user = new HashMap<>();
                user.put("id", t.getCreatedBy().getId());
                if (t.getCreatedBy().getEmployee() != null) {
                    user.put("name", t.getCreatedBy().getEmployee().getFullName());
                } else {
                    user.put("name", t.getCreatedBy().getEmail());
                }
                dto.put("createdBy", user);
            }

            List<InventoryItem> items = itemsByTx.getOrDefault(t.getId(), List.of());
            dto.put("items", items.stream().map(this::toItemDto).collect(Collectors.toList()));
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toItemDto(InventoryItem item) {
        Map<String, Object> iDto = new LinkedHashMap<>();
        iDto.put("id", item.getId());
        iDto.put("quantity", item.getQuantity());
        iDto.put("stockBefore", item.getStockBefore());
        iDto.put("stockAfter", item.getStockAfter());
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

    @PostMapping("/transaction")
    @Transactional
    public ResponseEntity<?> createTransaction(@RequestBody Map<String, Object> payload) {
        String typeStr = (String) payload.get("type");
        String note = (String) payload.get("note");
        List<?> itemsObj = (List<?>) payload.get("items");

        if (typeStr == null || itemsObj == null || itemsObj.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu thông tin loại giao dịch hoặc danh sách sản phẩm"));
        }

        TransactionType type;
        try {
            type = resolveTransactionType(typeStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Loại giao dịch không hợp lệ"));
        }

        List<ParsedInventoryLine> parsedLines;
        try {
            parsedLines = parseInventoryLines(itemsObj);
            if (parsedLines.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Thiếu danh sách sản phẩm hợp lệ"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (auth != null && auth.getPrincipal() != null) {
            String username = "";
            if (auth.getPrincipal() instanceof UserDetails) {
                username = ((UserDetails) auth.getPrincipal()).getUsername();
            } else if (auth.getPrincipal() instanceof String) {
                username = (String) auth.getPrincipal();
            }
            if (!username.isEmpty()) {
                currentUser = userRepository.findByEmail(username).orElse(null);
            }
        }
        if (currentUser == null) {
            currentUser = userRepository.findAll().stream().findFirst().orElseThrow();
        }

        List<PreparedInventoryLine> preparedLines;
        try {
            preparedLines = prepareInventoryLines(type, parsedLines);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setInvenTransactionId((type == TransactionType.IMPORT ? "INP-" : "EXP-") + System.currentTimeMillis());
        transaction.setTransactionType(type);
        transaction.setNote(note);
        transaction.setCreatedBy(currentUser);
        transaction = transactionRepository.save(transaction);

        for (PreparedInventoryLine line : preparedLines) {
            Product product = line.product();
            product.setCurrentStock(line.stockAfter());
            BigDecimal minimum = product.getMinimumStock() != null ? product.getMinimumStock() : BigDecimal.ZERO;
            product.setIsOutOfStock(line.stockAfter().compareTo(minimum) <= 0);
            productRepository.save(product);

            InventoryItem item = new InventoryItem();
            item.setInventoryTransaction(transaction);
            item.setProduct(product);
            item.setQuantity(line.quantity());
            item.setStockBefore(line.stockBefore());
            item.setStockAfter(line.stockAfter());
            itemRepository.save(item);
        }

        return ResponseEntity.ok(Map.of("message", "Ghi nhận giao dịch kho thành công"));
    }

    private static TransactionType resolveTransactionType(String typeStr) {
        if (typeStr == null) {
            throw new IllegalArgumentException("Loại giao dịch không hợp lệ");
        }
        String normalized = typeStr.trim().toUpperCase(Locale.ROOT);
        if ("EXPORT".equals(normalized)) {
            return TransactionType.EXPORT;
        }
        return TransactionType.valueOf(normalized);
    }

    private static List<ParsedInventoryLine> parseInventoryLines(List<?> itemsObj) {
        List<ParsedInventoryLine> lines = new ArrayList<>();
        for (Object itemObj : itemsObj) {
            if (!(itemObj instanceof Map<?, ?> itemMap)) {
                continue;
            }
            Object productIdRaw = itemMap.get("productId");
            if (productIdRaw == null) {
                continue;
            }
            BigDecimal quantity = itemMap.get("quantity") != null
                    ? new BigDecimal(itemMap.get("quantity").toString())
                    : BigDecimal.ZERO;
            if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            lines.add(new ParsedInventoryLine(UUID.fromString(productIdRaw.toString()), quantity));
        }
        return lines;
    }

    private List<PreparedInventoryLine> prepareInventoryLines(TransactionType type, List<ParsedInventoryLine> lines) {
        boolean decrement = type != TransactionType.IMPORT;
        Map<UUID, Product> products = lockProducts(lines.stream()
                .map(ParsedInventoryLine::productId)
                .toList());
        Map<UUID, BigDecimal> runningStocks = new LinkedHashMap<>();
        List<PreparedInventoryLine> prepared = new ArrayList<>();

        for (ParsedInventoryLine line : lines) {
            Product product = products.get(line.productId());
            BigDecimal stockBefore = runningStocks.getOrDefault(
                    line.productId(),
                    product.getCurrentStock() != null ? product.getCurrentStock() : BigDecimal.ZERO
            );
            BigDecimal stockAfter = decrement ? stockBefore.subtract(line.quantity()) : stockBefore.add(line.quantity());
            if (decrement && stockAfter.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Không đủ tồn kho cho sản phẩm " + product.getName());
            }
            runningStocks.put(line.productId(), stockAfter);
            prepared.add(new PreparedInventoryLine(product, line.quantity(), stockBefore, stockAfter));
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
}

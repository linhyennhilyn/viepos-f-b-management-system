package com.viepos.backend.dto;

import java.util.UUID;

public record OrderItemCountRow(UUID orderId, long itemCount) {}

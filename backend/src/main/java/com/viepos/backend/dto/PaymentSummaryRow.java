package com.viepos.backend.dto;

import com.viepos.backend.models.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** Thanh toán tóm tắt — không chứa transfer_proof_image_url. */
public record PaymentSummaryRow(
        UUID orderId,
        PaymentMethod paymentMethod,
        BigDecimal amount,
        LocalDateTime paidAt
) {}

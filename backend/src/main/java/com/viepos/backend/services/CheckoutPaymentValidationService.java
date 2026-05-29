package com.viepos.backend.services;

import com.viepos.backend.models.enums.PaymentMethod;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class CheckoutPaymentValidationService {

    public record ValidatedPayment(
            PaymentMethod method,
            BigDecimal paymentAmount,
            BigDecimal cashReceived
    ) {
    }

    public ValidatedPayment validate(String methodRaw, String paymentAmountRaw, String cashReceivedRaw, BigDecimal expectedAmount) {
        if (methodRaw == null || methodRaw.isBlank() || paymentAmountRaw == null || paymentAmountRaw.isBlank()) {
            throw new IllegalArgumentException("Thiếu thông tin thanh toán");
        }

        BigDecimal expected = safe(expectedAmount);
        BigDecimal requestedPayment = parseMoney(paymentAmountRaw, "Số tiền thanh toán không hợp lệ");
        PaymentMethod method = resolvePaymentMethod(methodRaw);

        if (requestedPayment.compareTo(expected) != 0) {
            throw new IllegalArgumentException("Số tiền thanh toán không khớp với tổng đơn hàng");
        }

        BigDecimal tendered = requestedPayment;
        if (method == PaymentMethod.CASH && cashReceivedRaw != null && !cashReceivedRaw.isBlank()) {
            tendered = parseMoney(cashReceivedRaw, "Số tiền khách đưa không hợp lệ");
        }

        if (method == PaymentMethod.CASH && tendered.compareTo(expected) < 0) {
            throw new IllegalArgumentException("Số tiền khách đưa nhỏ hơn tổng đơn hàng");
        }

        return new ValidatedPayment(method, expected, tendered);
    }

    public PaymentMethod resolvePaymentMethod(String methodRaw) {
        if ("transfer".equalsIgnoreCase(methodRaw) || "chuyển khoản".equalsIgnoreCase(methodRaw)) {
            return PaymentMethod.BANK_TRANSFER;
        }
        return PaymentMethod.CASH;
    }

    private static BigDecimal parseMoney(String raw, String message) {
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(message);
        }
    }

    private static BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}

package com.viepos.backend.services;

import com.viepos.backend.models.enums.PaymentMethod;
import com.viepos.backend.repositories.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Tự động xóa (null hóa) ảnh minh chứng CK trong DB sau N ngày kể từ paid_at.
 * Giúp giảm dung lượng JSON khi load danh sách đơn — không thay thế tối ưu N+1 query.
 */
@Service
public class TransferProofCleanupService {

    private static final Logger log = LoggerFactory.getLogger(TransferProofCleanupService.class);

    private final PaymentRepository paymentRepository;

    @Value("${viepos.transfer-proof.retention-days:2}")
    private int retentionDays;

    public TransferProofCleanupService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /** Chạy mỗi ngày lúc 03:00 (Asia/Ho_Chi_Minh). */
    @Scheduled(cron = "${viepos.transfer-proof.cleanup-cron:0 0 3 * * *}")
    @Transactional
    public void cleanupExpiredTransferProofs() {
        int cleared = runCleanup();
        if (cleared > 0) {
            log.info("Đã xóa minh chứng CK của {} payment (quá {} ngày từ paid_at)", cleared, retentionDays);
        }
    }

    @Transactional
    public int runCleanup() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        long pending = paymentRepository.countByPaymentMethodAndTransferProofImageUrlIsNotNullAndPaidAtBefore(
                PaymentMethod.BANK_TRANSFER,
                cutoff
        );
        if (pending == 0) {
            return 0;
        }
        return paymentRepository.clearExpiredTransferProofs(cutoff, PaymentMethod.BANK_TRANSFER);
    }
}

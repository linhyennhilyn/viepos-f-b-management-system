package com.viepos.backend.util;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * PostgreSQL TIMESTAMP và Spring {@link LocalDateTime} lưu giờ tường Việt Nam (không TZ).
 * API trả về ISO-8601 +07:00, không dịch chuyển giá trị giờ/phút.
 */
public final class ApiDateTime {
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter ISO_OFFSET = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private ApiDateTime() {}

    public static String toVietnamOffset(LocalDateTime value) {
        if (value == null) {
            return "";
        }
        return value.atZone(VN).format(ISO_OFFSET);
    }
}

package com.viepos.backend.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    void unhandledErrorsReturnSanitizedMessageAndTraceId() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ResponseEntity<Map<String, Object>> response = handler.handleUnhandledException(
                new IllegalStateException("database password leaked in stack")
        );

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).containsEntry("message", "Lỗi hệ thống. Vui lòng thử lại sau.");
        assertThat(response.getBody()).containsKey("traceId");
        assertThat(response.getBody()).doesNotContainKey("stackTrace");
        assertThat(response.getBody().toString()).doesNotContain("database password");
    }

    @Test
    void responseStatusExceptionsPreserveHttpStatusAndSanitizeBody() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ResponseEntity<Map<String, Object>> response = handler.handleResponseStatusException(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng")
        );

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).containsEntry("message", "Không tìm thấy đơn hàng");
        assertThat(response.getBody()).doesNotContainKey("stackTrace");
        assertThat(response.getBody()).doesNotContainKey("traceId");
    }

    @Test
    void springMvcStatusExceptionsDoNotBecomeGenericServerErrors() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        ResponseEntity<Map<String, Object>> response = handler.handleUnhandledException(
                new HttpRequestMethodNotSupportedException("PATCH")
        );

        assertThat(response.getStatusCode().value()).isEqualTo(405);
        assertThat(response.getBody()).containsEntry("message", "Yêu cầu không hợp lệ");
        assertThat(response.getBody()).doesNotContainKey("stackTrace");
        assertThat(response.getBody()).doesNotContainKey("traceId");
    }
}

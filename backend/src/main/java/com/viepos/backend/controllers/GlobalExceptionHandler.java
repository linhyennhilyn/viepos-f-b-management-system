package com.viepos.backend.controllers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(errorBody(e.getMessage(), null));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException e) {
        String message = e.getReason() != null && !e.getReason().isBlank()
                ? e.getReason()
                : "Yêu cầu không hợp lệ";
        return ResponseEntity.status(e.getStatusCode()).body(errorBody(message, null));
    }

    @ExceptionHandler({
            MethodArgumentTypeMismatchException.class,
            MethodArgumentNotValidException.class,
            org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class
    })
    public ResponseEntity<Map<String, Object>> handleFrameworkBadRequest(Exception e) {
        return ResponseEntity.badRequest().body(errorBody("Yêu cầu không hợp lệ", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnhandledException(Exception e) {
        if (e instanceof ErrorResponse errorResponse) {
            return ResponseEntity.status(errorResponse.getStatusCode())
                    .body(errorBody("Yêu cầu không hợp lệ", null));
        }
        String traceId = UUID.randomUUID().toString();
        log.error("Unhandled API error traceId={}", traceId, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorBody("Lỗi hệ thống. Vui lòng thử lại sau.", traceId));
    }

    private static Map<String, Object> errorBody(String message, String traceId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message != null && !message.isBlank() ? message : "Yêu cầu không hợp lệ");
        if (traceId != null) {
            body.put("traceId", traceId);
        }
        return body;
    }
}

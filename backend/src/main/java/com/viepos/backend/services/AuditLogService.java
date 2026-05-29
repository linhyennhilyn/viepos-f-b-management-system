package com.viepos.backend.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viepos.backend.models.AuditLog;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.AuditAction;
import com.viepos.backend.models.enums.AuditSource;
import com.viepos.backend.repositories.AuditLogRepository;
import com.viepos.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    private ObjectMapper objectMapper = new ObjectMapper();

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }

        String username;
        if (auth.getPrincipal() instanceof UserDetails details) {
            username = details.getUsername();
        } else if (auth.getPrincipal() instanceof String principalString) {
            username = principalString;
        } else {
            return null;
        }

        return userRepository.findByEmail(username).orElse(null);
    }

    public void log(User actor, AuditAction action, String entityType, UUID entityId, Object oldValues, Object newValues) {
        AuditLog auditLog = new AuditLog();
        auditLog.setAuditCode("AUD" + System.currentTimeMillis());
        auditLog.setUser(actor);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setOldValues(toJson(oldValues));
        auditLog.setNewValues(toJson(newValues));
        auditLog.setChangedFields(null);
        auditLog.setActionSource(AuditSource.API);
        auditLog.setIpAddress(null);
        auditLog.setDeviceInfo(null);
        auditLog.setNote(null);
        auditLogRepository.save(auditLog);
    }

    public void log(String actorEmail, AuditAction action, String entityType, UUID entityId, Object oldValues, Object newValues) {
        User actor = actorEmail != null ? userRepository.findByEmail(actorEmail).orElse(null) : null;
        log(actor, action, entityType, entityId, oldValues, newValues);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }
}

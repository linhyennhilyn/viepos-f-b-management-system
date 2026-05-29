package com.viepos.backend.repositories;

import com.viepos.backend.models.ServiceSession;
import com.viepos.backend.models.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceSessionRepository extends JpaRepository<ServiceSession, UUID> {
    Optional<ServiceSession> findBySessionCode(String sessionCode);
    Optional<ServiceSession> findByCard_IdAndStatus(UUID cardId, SessionStatus status);
    boolean existsByCard_IdAndStatus(UUID cardId, SessionStatus status);
    List<ServiceSession> findByStatusOrderByStartedAtDesc(SessionStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT MIN(s.startedAt) FROM ServiceSession s")
    java.time.LocalDateTime findEarliestStartedAt();

    @org.springframework.data.jpa.repository.Query("SELECT MAX(s.startedAt) FROM ServiceSession s")
    java.time.LocalDateTime findLatestStartedAt();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE ServiceSession s SET s.order = null WHERE s.startedAt BETWEEN :from AND :to")
    void clearOrderReferences(@org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from, @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ServiceSession s WHERE s.startedAt BETWEEN :from AND :to")
    void deleteByStartedAtBetween(@org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from, @org.springframework.data.repository.query.Param("to") java.time.LocalDateTime to);
}

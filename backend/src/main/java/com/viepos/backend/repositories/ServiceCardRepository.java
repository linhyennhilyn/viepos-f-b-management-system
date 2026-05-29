package com.viepos.backend.repositories;

import com.viepos.backend.models.ServiceCard;
import com.viepos.backend.models.enums.CardStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceCardRepository extends JpaRepository<ServiceCard, UUID> {
    Optional<ServiceCard> findByCardCode(String cardCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM ServiceCard c WHERE c.cardCode = :cardCode")
    Optional<ServiceCard> findByCardCodeForUpdate(@Param("cardCode") String cardCode);

    Optional<ServiceCard> findByRfidUid(String rfidUid);
    List<ServiceCard> findByStatus(CardStatus status);
}

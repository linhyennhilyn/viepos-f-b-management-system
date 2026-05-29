package com.viepos.backend.repositories;

import com.viepos.backend.models.AccountRequest;
import com.viepos.backend.models.enums.RequestStatus;
import com.viepos.backend.models.enums.RequestType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRequestRepository extends JpaRepository<AccountRequest, UUID> {
    Optional<AccountRequest> findByRequestCode(String requestCode);
    List<AccountRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status);
    List<AccountRequest> findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType requestType, RequestStatus status);
    boolean existsByRequestEmailAndStatus(String requestEmail, RequestStatus status);
    boolean existsByRequestPhoneAndStatus(String requestPhone, RequestStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AccountRequest> findByIdAndRequestTypeAndStatus(UUID id, RequestType requestType, RequestStatus status);
}

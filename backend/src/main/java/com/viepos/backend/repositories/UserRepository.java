package com.viepos.backend.repositories;

import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmployee_EmployeeId(String employeeId);
    boolean existsByEmail(String email);

    @Query("""
            SELECT u FROM User u
            JOIN FETCH u.employee
            WHERE u.createdAt BETWEEN :from AND :to
            """)
    List<User> findByCreatedAtBetweenWithEmployee(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("""
            SELECT u FROM User u
            JOIN FETCH u.employee e
            WHERE e.role = :role
            ORDER BY e.fullName ASC
            """)
    List<User> findAllWithEmployeeByRole(@Param("role") EmployeeRole role);

    @Query("""
            SELECT u FROM User u
            JOIN FETCH u.employee e
            ORDER BY e.fullName ASC
            """)
    List<User> findAllWithEmployeeOrderByFullNameAsc();

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM User u WHERE u.employee.id IN :employeeIds")
    void deleteByEmployeeIdIn(@Param("employeeIds") java.util.Collection<UUID> employeeIds);
}

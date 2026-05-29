package com.viepos.backend.repositories;

import com.viepos.backend.models.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByEmployeeId(String employeeId);
    Optional<Employee> findByPersonalEmail(String personalEmail);
    Optional<Employee> findByPhone(String phone);
    boolean existsByEmployeeId(String employeeId);
    boolean existsByPersonalEmail(String personalEmail);
    boolean existsByPhone(String phone);

    @org.springframework.data.jpa.repository.Query("SELECT MIN(e.endDate) FROM Employee e WHERE e.status = 'RESIGNED'")
    java.time.LocalDate findEarliestResignedEndDate();

    @org.springframework.data.jpa.repository.Query("SELECT MAX(e.endDate) FROM Employee e WHERE e.status = 'RESIGNED'")
    java.time.LocalDate findLatestResignedEndDate();

    @org.springframework.data.jpa.repository.Query("SELECT e.id FROM Employee e WHERE e.status = :status AND e.endDate BETWEEN :from AND :to")
    java.util.List<UUID> findIdsByStatusAndEndDateBetween(
            @org.springframework.data.repository.query.Param("status") com.viepos.backend.models.enums.EmployeeStatus status,
            @org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDate to
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Employee e WHERE e.id IN :employeeIds")
    void deleteByIdIn(@org.springframework.data.repository.query.Param("employeeIds") java.util.Collection<UUID> employeeIds);
}

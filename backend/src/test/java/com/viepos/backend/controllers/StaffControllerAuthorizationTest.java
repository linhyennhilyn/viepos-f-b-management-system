package com.viepos.backend.controllers;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.EmployeeStatus;
import com.viepos.backend.repositories.EmployeeRepository;
import com.viepos.backend.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffControllerAuthorizationTest {

    private StaffController controller;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        controller = new StaffController();
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);
        ReflectionTestUtils.setField(controller, "employeeRepository", employeeRepository);
        ReflectionTestUtils.setField(controller, "passwordEncoder", passwordEncoder);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void adminCannotCreateAdminAccount() {
        authenticateAs(currentUser(EmployeeRole.ADMIN));
        when(userRepository.existsByEmail("new-admin@example.test")).thenReturn(false);
        when(employeeRepository.existsByPhone("0900000000")).thenReturn(false);

        ResponseEntity<?> response = controller.createStaff(Map.of(
                "name", "New Admin",
                "email", "new-admin@example.test",
                "phone", "0900000000",
                "role", "ADMIN",
                "password", "secret-password"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(employeeRepository, never()).save(any(Employee.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void rootAdminCanCreateAdminAccount() {
        authenticateAs(currentUser(EmployeeRole.ROOT_ADMIN));
        when(userRepository.existsByEmail("new-admin@example.test")).thenReturn(false);
        when(employeeRepository.existsByPhone("0900000000")).thenReturn(false);
        when(passwordEncoder.encode("secret-password")).thenReturn("encoded-password");
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> {
            Employee employee = invocation.getArgument(0);
            employee.setId(UUID.randomUUID());
            return employee;
        });
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            user.setCreatedAt(LocalDateTime.now());
            return user;
        });

        ResponseEntity<?> response = controller.createStaff(Map.of(
                "name", "New Admin",
                "email", "new-admin@example.test",
                "phone", "0900000000",
                "role", "ADMIN",
                "password", "secret-password"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<Employee> employeeCaptor = ArgumentCaptor.forClass(Employee.class);
        verify(employeeRepository).save(employeeCaptor.capture());
        assertThat(employeeCaptor.getValue().getRole()).isEqualTo(EmployeeRole.ADMIN);
    }

    @Test
    void rootAdminCannotCreateAdminWithoutPasswordOrPersistEmployee() {
        authenticateAs(currentUser(EmployeeRole.ROOT_ADMIN));
        when(userRepository.existsByEmail("new-admin@example.test")).thenReturn(false);
        when(employeeRepository.existsByPhone("0900000000")).thenReturn(false);

        ResponseEntity<?> response = controller.createStaff(Map.of(
                "name", "New Admin",
                "email", "new-admin@example.test",
                "phone", "0900000000",
                "role", "ADMIN"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(employeeRepository, never()).save(any(Employee.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void adminCannotPromoteStaffToAdmin() {
        UUID targetId = UUID.randomUUID();
        authenticateAs(currentUser(EmployeeRole.ADMIN));
        User staffUser = userWithRole("staff@example.test", EmployeeRole.STAFF);
        staffUser.setId(targetId);
        when(userRepository.findById(targetId)).thenReturn(Optional.of(staffUser));

        ResponseEntity<?> response = controller.updateStaff(targetId.toString(), Map.of("role", "ADMIN"));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(employeeRepository, never()).save(any(Employee.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void adminCannotEditExistingAdmin() {
        UUID targetId = UUID.randomUUID();
        authenticateAs(currentUser(EmployeeRole.ADMIN));
        User adminUser = userWithRole("other-admin@example.test", EmployeeRole.ADMIN);
        adminUser.setId(targetId);
        when(userRepository.findById(targetId)).thenReturn(Optional.of(adminUser));

        ResponseEntity<?> response = controller.updateStaff(targetId.toString(), Map.of("name", "Changed"));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(employeeRepository, never()).save(any(Employee.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void adminCannotDeleteRootAdmin() {
        UUID targetId = UUID.randomUUID();
        authenticateAs(currentUser(EmployeeRole.ADMIN));
        User rootUser = userWithRole("root-target@example.test", EmployeeRole.ROOT_ADMIN);
        rootUser.setId(targetId);
        when(userRepository.findById(targetId)).thenReturn(Optional.of(rootUser));

        ResponseEntity<?> response = controller.deleteStaff(targetId.toString());

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    private void authenticateAs(User currentUser) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser.getEmail(), null)
        );
        when(userRepository.findByEmail(currentUser.getEmail())).thenReturn(Optional.of(currentUser));
    }

    private static User currentUser(EmployeeRole role) {
        return userWithRole(role.name().toLowerCase() + "@example.test", role);
    }

    private static User userWithRole(String email, EmployeeRole role) {
        Employee employee = new Employee();
        employee.setEmployeeId("EMP-" + role.name());
        employee.setFullName(role.name());
        employee.setPersonalEmail(email);
        employee.setPhone("09" + Math.abs(email.hashCode()));
        employee.setRole(role);
        employee.setStatus(EmployeeStatus.ACTIVE);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setEmployee(employee);
        user.setPassword("password");
        return user;
    }
}

package com.viepos.backend.controllers;

import com.viepos.backend.models.AccountRequest;
import com.viepos.backend.models.Employee;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.EmployeeStatus;
import com.viepos.backend.models.enums.RequestStatus;
import com.viepos.backend.models.enums.RequestType;
import com.viepos.backend.repositories.AccountRequestRepository;
import com.viepos.backend.repositories.EmployeeRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.services.AuditLogService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffControllerAccountRequestSafetyTest {

    private StaffController staffController;
    private AuthController authController;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AccountRequestRepository requestRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        staffController = new StaffController();
        ReflectionTestUtils.setField(staffController, "userRepository", userRepository);
        ReflectionTestUtils.setField(staffController, "employeeRepository", employeeRepository);
        ReflectionTestUtils.setField(staffController, "requestRepository", requestRepository);
        ReflectionTestUtils.setField(staffController, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(staffController, "authenticationManager", authenticationManager);
        ReflectionTestUtils.setField(staffController, "auditLogService", auditLogService);

        authController = new AuthController();
        ReflectionTestUtils.setField(authController, "userRepository", userRepository);
        ReflectionTestUtils.setField(authController, "employeeRepository", employeeRepository);
        ReflectionTestUtils.setField(authController, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authController, "requestRepository", requestRepository);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void staffRegistrationNameCannotSmuggleAdminRoleOnApproval() {
        UUID requestId = UUID.randomUUID();
        authenticateAs(userWithRole("root@example.test", EmployeeRole.ROOT_ADMIN));
        AccountRequest request = registerRequest(requestId, "Eve [ADMIN]", "REQ1");
        when(requestRepository.findByIdAndRequestTypeAndStatus(requestId, RequestType.REGISTER, RequestStatus.PENDING)).thenReturn(Optional.of(request));
        when(userRepository.existsByEmail("eve@example.test")).thenReturn(false);
        when(employeeRepository.existsByPhone("0900000001")).thenReturn(false);
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<?> response = staffController.approveStaff(requestId.toString());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<Employee> employeeCaptor = ArgumentCaptor.forClass(Employee.class);
        verify(employeeRepository).save(employeeCaptor.capture());
        assertThat(employeeCaptor.getValue().getRole()).isEqualTo(EmployeeRole.STAFF);
        assertThat(employeeCaptor.getValue().getFullName()).isEqualTo("Eve");
    }

    @Test
    void adminRegistrationUsesServerControlledMarkerNotNameSuffix() {
        when(userRepository.existsByEmail("manager@example.test")).thenReturn(false);
        when(employeeRepository.existsByPhone("0900000002")).thenReturn(false);
        when(passwordEncoder.encode("manager-password")).thenReturn("encoded-password");

        ResponseEntity<?> response = authController.registerAdmin(Map.of(
                "name", "Manager [ROOT_ADMIN]",
                "email", "manager@example.test",
                "phone", "0900000002",
                "password", "manager-password"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<AccountRequest> requestCaptor = ArgumentCaptor.forClass(AccountRequest.class);
        verify(requestRepository).save(requestCaptor.capture());
        assertThat(requestCaptor.getValue().getRequestCode()).startsWith("ADMIN_REQ");
        assertThat(requestCaptor.getValue().getRequestFullName()).isEqualTo("Manager");
    }

    @Test
    @SuppressWarnings("unchecked")
    void pendingRequestMappingUsesServerControlledAdminMarker() {
        AccountRequest request = registerRequest(UUID.randomUUID(), "Manager [ADMIN]", "ADMIN_REQ1");
        when(requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.REGISTER, RequestStatus.PENDING))
                .thenReturn(List.of(request));

        ResponseEntity<List<Map<String, Object>>> response = staffController.getPendingStaff();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> mapped = response.getBody().get(0);
        assertThat(mapped.get("role")).isEqualTo("ADMIN");
        assertThat(mapped.get("name")).isEqualTo("Manager");
    }

    @Test
    void loggedOutForgotPinDoesNotCreateResetRequest() {
        ResponseEntity<?> response = staffController.requestForgotPin(Map.of(
                "email", "staff@example.test",
                "newPin", "123456"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(410);
        verify(requestRepository, never()).save(any(AccountRequest.class));
    }

    @Test
    void pinChangeRequestCannotTargetAnotherAuthenticatedUser() {
        User current = userWithRole("current@example.test", EmployeeRole.STAFF);
        authenticateAs(current);

        ResponseEntity<?> response = staffController.requestPinChange(Map.of(
                "email", "target@example.test",
                "oldPin", "111111",
                "newPin", "222222"
        ));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(authenticationManager, never()).authenticate(any());
        verify(requestRepository, never()).save(any(AccountRequest.class));
    }

    @Test
    void pinChangeApprovalRejectsResetRequestType() {
        UUID requestId = UUID.randomUUID();
        AccountRequest resetRequest = pinRequest(requestId, RequestType.RESET_PIN);
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(resetRequest));

        ResponseEntity<?> response = staffController.approvePinRequest(requestId.toString());

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(userRepository, never()).save(any(User.class));
        verify(requestRepository, never()).save(resetRequest);
    }

    @Test
    void adminCannotRejectAdminRegistrationRequest() {
        UUID requestId = UUID.randomUUID();
        authenticateAs(userWithRole("admin@example.test", EmployeeRole.ADMIN));
        AccountRequest request = registerRequest(requestId, "Manager", "ADMIN_REQ2");
        when(requestRepository.findByIdAndRequestTypeAndStatus(requestId, RequestType.REGISTER, RequestStatus.PENDING)).thenReturn(Optional.of(request));

        ResponseEntity<?> response = staffController.rejectStaff(requestId.toString());

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verify(requestRepository, never()).save(request);
    }

    private void authenticateAs(User currentUser) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser.getEmail(), null)
        );
        when(userRepository.findByEmail(currentUser.getEmail())).thenReturn(Optional.of(currentUser));
    }

    private static AccountRequest registerRequest(UUID id, String fullName, String requestCode) {
        AccountRequest request = new AccountRequest();
        request.setId(id);
        request.setRequestCode(requestCode);
        request.setRequestType(RequestType.REGISTER);
        request.setRequestFullName(fullName);
        request.setRequestEmail("eve@example.test");
        request.setRequestPhone("0900000001");
        request.setRequestPinHash("encoded-pin");
        request.setStatus(RequestStatus.PENDING);
        return request;
    }

    private static AccountRequest pinRequest(UUID id, RequestType type) {
        AccountRequest request = new AccountRequest();
        request.setId(id);
        request.setRequestCode("REQ-PIN");
        request.setRequestType(type);
        request.setEmployee(employeeWithRole("target@example.test", EmployeeRole.STAFF));
        request.setRequestPinHash("encoded-pin");
        request.setStatus(RequestStatus.PENDING);
        return request;
    }

    private static User userWithRole(String email, EmployeeRole role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setPassword("password");
        user.setEmployee(employeeWithRole(email, role));
        return user;
    }

    private static Employee employeeWithRole(String email, EmployeeRole role) {
        Employee employee = new Employee();
        employee.setEmployeeId("EMP-" + Math.abs(email.hashCode()));
        employee.setFullName(email);
        employee.setPersonalEmail(email);
        employee.setPhone("09" + Math.abs(email.hashCode()));
        employee.setRole(role);
        employee.setStatus(EmployeeStatus.ACTIVE);
        return employee;
    }
}

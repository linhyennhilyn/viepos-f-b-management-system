package com.viepos.backend.controllers;

import com.viepos.backend.models.AccountRequest;
import com.viepos.backend.models.Employee;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.AuditAction;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.EmployeeStatus;
import com.viepos.backend.models.enums.RequestStatus;
import com.viepos.backend.models.enums.RequestType;
import com.viepos.backend.repositories.AccountRequestRepository;
import com.viepos.backend.repositories.EmployeeRepository;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.security.JwtUtil;
import com.viepos.backend.services.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import com.viepos.backend.util.ApiDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/staff")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class StaffController {

    private static final String ADMIN_REQUEST_PREFIX = "ADMIN_REQ";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private AccountRequestRepository requestRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuditLogService auditLogService;

    /** DB: ACTIVE/RESIGNED → UI: APPROVED/REJECTED */
    private static String statusToUi(EmployeeStatus status) {
        if (status == null || status == EmployeeStatus.ACTIVE) {
            return "APPROVED";
        }
        return "REJECTED";
    }

    private static EmployeeStatus statusFromUi(String uiStatus) {
        if (uiStatus == null || uiStatus.isBlank()) {
            return EmployeeStatus.ACTIVE;
        }
        String s = uiStatus.trim().toUpperCase();
        if ("APPROVED".equals(s) || "ACTIVE".equals(s)) {
            return EmployeeStatus.ACTIVE;
        }
        if ("REJECTED".equals(s) || "RESIGNED".equals(s)) {
            return EmployeeStatus.RESIGNED;
        }
        return EmployeeStatus.valueOf(s);
    }

    private static String roleToUi(EmployeeRole role) {
        if (role == null || role == EmployeeRole.STAFF) {
            return "Nhân viên";
        }
        if (role == EmployeeRole.ADMIN || role == EmployeeRole.ROOT_ADMIN) {
            return "Quản lý";
        }
        return role.name();
    }

    // Helper to format User to old UI struct
    private Map<String, Object> mapUserToOldStruct(User user, String statusOverride) {
        Map<String, Object> map = new HashMap<>();
        Employee emp = user.getEmployee();
        map.put("id", user.getId().toString());
        map.put("employeeId", emp != null ? emp.getEmployeeId() : null);
        map.put("name", emp != null ? emp.getFullName() : "");
        map.put("email", user.getEmail());
        map.put("phone", emp != null ? emp.getPhone() : "");
        map.put("role", emp != null ? roleToUi(emp.getRole()) : "Nhân viên");
        map.put("status", statusOverride != null ? statusOverride : statusToUi(emp != null ? emp.getStatus() : null));
        map.put("createdAt", ApiDateTime.toVietnamOffset(user.getCreatedAt()));
        return map;
    }

    private Map<String, Object> mapRequestToOldStruct(AccountRequest req, String status) {
        Map<String, Object> map = new HashMap<>();
        String fullName = req.getRequestFullName() != null ? req.getRequestFullName() : (req.getEmployee() != null ? req.getEmployee().getFullName() : "");
        String roleStr = req.getRequestType() == RequestType.REGISTER
                ? requestedRegisterRole(req).name()
                : "STAFF";
        fullName = stripLegacyRoleSuffix(fullName);
        
        map.put("id", req.getId().toString());
        map.put("name", fullName);
        map.put("email", req.getRequestEmail() != null ? req.getRequestEmail() : "");
        map.put("phone", req.getRequestPhone() != null ? req.getRequestPhone() : "");
        map.put("role", roleStr);
        map.put("status", status);
        map.put("createdAt", ApiDateTime.toVietnamOffset(req.getCreatedAt()));
        
        // Wrap for pin requests where frontend expects req.user.name
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("name", req.getEmployee() != null ? req.getEmployee().getFullName() : "");
        userMap.put("email", req.getEmployee() != null ? req.getEmployee().getPersonalEmail() : "");
        map.put("user", userMap);
        
        return map;
    }

    private User getCurrentUser() {
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

    private boolean currentUserIsRootAdmin() {
        User currentUser = getCurrentUser();
        return currentUser != null
                && currentUser.getEmployee() != null
                && currentUser.getEmployee().getRole() == EmployeeRole.ROOT_ADMIN;
    }

    private static boolean isElevatedRole(EmployeeRole role) {
        return role == EmployeeRole.ADMIN || role == EmployeeRole.ROOT_ADMIN;
    }

    private static EmployeeRole requestedRegisterRole(AccountRequest req) {
        String requestCode = req.getRequestCode();
        return requestCode != null && requestCode.startsWith(ADMIN_REQUEST_PREFIX)
                ? EmployeeRole.ADMIN
                : EmployeeRole.STAFF;
    }

    private static String stripLegacyRoleSuffix(String fullName) {
        if (fullName == null) {
            return null;
        }
        return fullName
                .replaceAll("\\s*\\[(ADMIN|ROOT_ADMIN)]\\s*$", "")
                .trim();
    }

    private ResponseEntity<?> unavailableRequestResponse(UUID id, RequestType expectedType) {
        Optional<AccountRequest> existing = requestRepository.findById(id);
        if (existing.isEmpty() || existing.get().getRequestType() != expectedType) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.status(400).body(Map.of("message", "Yêu cầu này đã được xử lý."));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerStaff(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String email = request.get("email");
        String phone = request.get("phone");
        String pin = request.get("pin");

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email này đã được đăng ký!"));
        }
        if (employeeRepository.existsByPhone(phone)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số điện thoại này đã được sử dụng!"));
        }
        if (requestRepository.existsByRequestEmailAndStatus(email, RequestStatus.PENDING)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email này đang chờ được duyệt!"));
        }
        if (requestRepository.existsByRequestPhoneAndStatus(phone, RequestStatus.PENDING)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số điện thoại này đang chờ được duyệt!"));
        }

        AccountRequest req = new AccountRequest();
        req.setRequestCode("REQ" + System.currentTimeMillis());
        req.setRequestType(RequestType.REGISTER);
        req.setRequestFullName(stripLegacyRoleSuffix(name));
        req.setRequestEmail(email);
        req.setRequestPhone(phone);
        req.setRequestPinHash(passwordEncoder.encode(pin));
        req.setStatus(RequestStatus.PENDING);
        requestRepository.save(req);

        return ResponseEntity.ok(Map.of("message", "Registration successful. Please wait for manager approval."));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingStaff() {
        List<AccountRequest> pending = requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.REGISTER, RequestStatus.PENDING);
        return ResponseEntity.ok(pending.stream().map(r -> mapRequestToOldStruct(r, "PENDING")).collect(Collectors.toList()));
    }

    @PutMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveStaff(@PathVariable String id) {
        UUID requestId = UUID.fromString(id);
        Optional<AccountRequest> reqOpt = requestRepository.findByIdAndRequestTypeAndStatus(requestId, RequestType.REGISTER, RequestStatus.PENDING);
        if (reqOpt.isPresent()) {
            AccountRequest req = reqOpt.get();
            User currentUser = getCurrentUser();
            EmployeeRole newRole = requestedRegisterRole(req);
            if (isElevatedRole(newRole) && !currentUserIsRootAdmin()) {
                return ResponseEntity.status(403).body(Map.of("message", "Chỉ Root Admin được duyệt yêu cầu tạo tài khoản Quản lý."));
            }
            if (currentUser != null && currentUser.getEmployee() != null
                    && currentUser.getEmployee().getRole() == EmployeeRole.ADMIN
                    && req.getEmployee() != null
                    && isElevatedRole(req.getEmployee().getRole())) {
                return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền duyệt yêu cầu của Quản lý khác."));
            }
            if (userRepository.existsByEmail(req.getRequestEmail())) {
                return ResponseEntity.status(400).body(Map.of("message", "Email này đã tồn tại trong hệ thống."));
            }
            if (employeeRepository.existsByPhone(req.getRequestPhone())) {
                return ResponseEntity.status(400).body(Map.of("message", "Số điện thoại này đã tồn tại trong hệ thống."));
            }
            if (currentUser != null && currentUser.getEmployee() != null) {
                req.setApprovedBy(currentUser.getEmployee());
            }
            req.setStatus(RequestStatus.APPROVED);
            req.setApprovedAt(LocalDateTime.now());
            requestRepository.save(req);

            String fullName = stripLegacyRoleSuffix(req.getRequestFullName());

            Employee emp = new Employee();
            emp.setEmployeeId("EMP" + System.currentTimeMillis());
            emp.setFullName(fullName);
            emp.setPersonalEmail(req.getRequestEmail());
            emp.setPhone(req.getRequestPhone());
            emp.setRole(newRole);
            emp.setStatus(EmployeeStatus.ACTIVE);
            employeeRepository.save(emp);

            User user = new User();
            user.setEmployee(emp);
            user.setEmail(req.getRequestEmail());
            user.setPassword(req.getRequestPinHash());
            userRepository.save(user);

            if (currentUser != null) {
                auditLogService.log(currentUser, AuditAction.APPROVE, "account_requests", req.getId(), null, Map.of("requestCode", req.getRequestCode()));
            }

            return ResponseEntity.ok(Map.of("message", "Staff account approved. Email sent."));
        }
        return unavailableRequestResponse(requestId, RequestType.REGISTER);
    }
    
    @PutMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectStaff(@PathVariable String id) {
        UUID requestId = UUID.fromString(id);
        Optional<AccountRequest> reqOpt = requestRepository.findByIdAndRequestTypeAndStatus(requestId, RequestType.REGISTER, RequestStatus.PENDING);
        if (reqOpt.isPresent()) {
            AccountRequest req = reqOpt.get();
            User currentUser = getCurrentUser();
            EmployeeRole requestedRole = requestedRegisterRole(req);
            if (isElevatedRole(requestedRole) && !currentUserIsRootAdmin()) {
                return ResponseEntity.status(403).body(Map.of("message", "Chỉ Root Admin được từ chối yêu cầu tạo tài khoản Quản lý."));
            }
            if (currentUser != null && currentUser.getEmployee() != null) {
                if (currentUser.getEmployee().getRole() == EmployeeRole.ADMIN) {
                    if (req.getEmployee() != null && (req.getEmployee().getRole() == EmployeeRole.ADMIN || req.getEmployee().getRole() == EmployeeRole.ROOT_ADMIN)) {
                        return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền từ chối yêu cầu của Quản lý khác."));
                    }
                }
                req.setApprovedBy(currentUser.getEmployee());
            }
            req.setStatus(RequestStatus.REJECTED);
            req.setApprovedAt(LocalDateTime.now());
            requestRepository.save(req);
            if (currentUser != null) {
                auditLogService.log(currentUser, AuditAction.REJECT, "account_requests", req.getId(), null, Map.of("requestCode", req.getRequestCode()));
            }
            return ResponseEntity.ok(Map.of("message", "Staff account rejected."));
        }
        return unavailableRequestResponse(requestId, RequestType.REGISTER);
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginStaff(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String pin = request.get("pin");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Tài khoản không tồn tại."));
        }

        User user = userOpt.get();
        
        if (user.getEmployee() == null) {
            return ResponseEntity.status(500).body(Map.of("ok", false, "message", "User employee record not found"));
        }
        
        // Luồng POS: chỉ nhân viên (STAFF) đăng nhập bằng PIN
        if (user.getEmployee().getRole() != EmployeeRole.STAFF) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Email hoặc mã PIN không chính xác."));
        }

        if (user.getEmployee().getStatus() != EmployeeStatus.ACTIVE) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Tài khoản của bạn đã bị vô hiệu hóa hoặc nghỉ việc."));
        }

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, pin));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Email hoặc mã PIN không chính xác."));
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        final String jwt = jwtUtil.generateToken(userDetails);

        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        response.put("token", jwt);
        response.put("role", user.getEmployee().getRole().name());
        response.put("name", user.getEmployee().getFullName());
        response.put("id", user.getId());
        response.put("employeeId", user.getEmployee().getEmployeeId()); // "EMPxxx" — dùng để filter đơn hàng
        response.put("phone", user.getEmployee().getPhone());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-pin")
    public ResponseEntity<?> verifyPin(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String pin = request.get("pin");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent() && userOpt.get().getEmployee() != null && userOpt.get().getEmployee().getStatus() != EmployeeStatus.ACTIVE) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Tài khoản của bạn đã bị vô hiệu hóa hoặc nghỉ việc."));
        }

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, pin));
            return ResponseEntity.ok(Map.of("ok", true, "message", "Mã PIN chính xác."));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Mã PIN cũ không chính xác."));
        }
    }

    @PostMapping("/pin-change-request")
    public ResponseEntity<?> requestPinChange(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String oldPin = request.get("oldPin");
        String newPin = request.get("newPin");

        User currentUser = getCurrentUser();
        if (currentUser == null || currentUser.getEmployee() == null) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Vui lòng đăng nhập để đổi mã PIN."));
        }
        if (email == null || !email.equalsIgnoreCase(currentUser.getEmail())) {
            return ResponseEntity.status(403).body(Map.of("ok", false, "message", "Bạn chỉ được yêu cầu đổi mã PIN cho chính tài khoản đang đăng nhập."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Tài khoản không tồn tại."));
        if (userOpt.get().getEmployee() != null && userOpt.get().getEmployee().getStatus() != EmployeeStatus.ACTIVE) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Tài khoản của bạn đã bị vô hiệu hóa hoặc nghỉ việc."));
        }

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, oldPin));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Mã PIN cũ không chính xác."));
        }

        AccountRequest req = new AccountRequest();
        req.setRequestCode("REQ" + System.currentTimeMillis());
        req.setRequestType(RequestType.CHANGE_PIN);
        req.setEmployee(userOpt.get().getEmployee());
        req.setRequestPinHash(passwordEncoder.encode(newPin));
        requestRepository.save(req);

        return ResponseEntity.ok(Map.of("ok", true, "message", "Yêu cầu đổi mã PIN đã được gửi thành công."));
    }

    @PostMapping("/forgot-pin")
    public ResponseEntity<?> requestForgotPin(@RequestBody Map<String, String> request) {
        return ResponseEntity.status(410).body(Map.of("ok", false, "message", "Vui lòng liên hệ quản lý để được cấp lại mã PIN."));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> getAllStaff() {
        List<Map<String, Object>> staff = userRepository.findAllWithEmployeeOrderByFullNameAsc().stream()
                .map(u -> mapUserToOldStruct(u, null))
                .collect(Collectors.toList());
        return ResponseEntity.ok(staff);
    }

    @GetMapping("/history/accounts")
    public ResponseEntity<List<Map<String, Object>>> getAccountHistory() {
        List<AccountRequest> history = requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.REGISTER, RequestStatus.APPROVED);
        history.addAll(requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.REGISTER, RequestStatus.REJECTED));
        return ResponseEntity.ok(history.stream().map(r -> mapRequestToOldStruct(r, r.getStatus().name())).collect(Collectors.toList()));
    }

    @GetMapping("/pin-change-requests/pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingPinRequests() {
        List<AccountRequest> pending = requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.CHANGE_PIN, RequestStatus.PENDING);
        return ResponseEntity.ok(pending.stream().map(r -> mapRequestToOldStruct(r, "PENDING")).collect(Collectors.toList()));
    }

    @GetMapping("/pin-change-requests/history")
    public ResponseEntity<List<Map<String, Object>>> getPinChangeHistory() {
        List<AccountRequest> history = requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.CHANGE_PIN, RequestStatus.APPROVED);
        history.addAll(requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.CHANGE_PIN, RequestStatus.REJECTED));
        return ResponseEntity.ok(history.stream().map(r -> mapRequestToOldStruct(r, r.getStatus().name())).collect(Collectors.toList()));
    }

    @PutMapping("/pin-change-requests/{id}/approve")
    @Transactional
    public ResponseEntity<?> approvePinRequest(@PathVariable String id) {
        return approvePinRequest(id, RequestType.CHANGE_PIN);
    }

    private ResponseEntity<?> approvePinRequest(String id, RequestType expectedType) {
        UUID requestId = UUID.fromString(id);
        Optional<AccountRequest> reqOpt = requestRepository.findByIdAndRequestTypeAndStatus(requestId, expectedType, RequestStatus.PENDING);
        if (reqOpt.isPresent()) {
            AccountRequest req = reqOpt.get();
            User currentUser = getCurrentUser();
            if (currentUser != null && currentUser.getEmployee() != null) {
                if (currentUser.getEmployee().getRole() == EmployeeRole.ADMIN) {
                    if (req.getEmployee() != null && (req.getEmployee().getRole() == EmployeeRole.ADMIN || req.getEmployee().getRole() == EmployeeRole.ROOT_ADMIN)) {
                        return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền duyệt yêu cầu của Quản lý khác."));
                    }
                }
                req.setApprovedBy(currentUser.getEmployee());
            }
            req.setStatus(RequestStatus.APPROVED);
            req.setApprovedAt(LocalDateTime.now());
            
            User user = userRepository.findByEmail(req.getEmployee().getPersonalEmail()).orElseThrow();
            user.setPassword(req.getRequestPinHash());
            user.setPinChangeCount(user.getPinChangeCount() + 1);
            userRepository.save(user);
            requestRepository.save(req);
            if (currentUser != null) {
                auditLogService.log(currentUser, AuditAction.APPROVE, "account_requests", req.getId(), null, Map.of("requestCode", req.getRequestCode()));
            }
            return ResponseEntity.ok(Map.of("message", "Đã duyệt yêu cầu đổi mã PIN."));
        }
        return unavailablePinRequestResponse(requestId, expectedType);
    }

    @PutMapping("/pin-change-requests/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectPinRequest(@PathVariable String id) {
        return rejectPinRequest(id, RequestType.CHANGE_PIN);
    }

    private ResponseEntity<?> rejectPinRequest(String id, RequestType expectedType) {
        UUID requestId = UUID.fromString(id);
        Optional<AccountRequest> reqOpt = requestRepository.findByIdAndRequestTypeAndStatus(requestId, expectedType, RequestStatus.PENDING);
        if (reqOpt.isPresent()) {
            AccountRequest req = reqOpt.get();
            User currentUser = getCurrentUser();
            if (currentUser != null && currentUser.getEmployee() != null) {
                if (currentUser.getEmployee().getRole() == EmployeeRole.ADMIN) {
                    if (req.getEmployee() != null && (req.getEmployee().getRole() == EmployeeRole.ADMIN || req.getEmployee().getRole() == EmployeeRole.ROOT_ADMIN)) {
                        return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền từ chối yêu cầu của Quản lý khác."));
                    }
                }
                req.setApprovedBy(currentUser.getEmployee());
            }
            req.setStatus(RequestStatus.REJECTED);
            req.setApprovedAt(LocalDateTime.now());
            requestRepository.save(req);
            if (currentUser != null) {
                auditLogService.log(currentUser, AuditAction.REJECT, "account_requests", req.getId(), null, Map.of("requestCode", req.getRequestCode()));
            }
            return ResponseEntity.ok(Map.of("message", "Đã từ chối yêu cầu."));
        }
        return unavailablePinRequestResponse(requestId, expectedType);
    }

    private ResponseEntity<?> unavailablePinRequestResponse(UUID id, RequestType expectedType) {
        Optional<AccountRequest> existing = requestRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (existing.get().getRequestType() != expectedType) {
            return ResponseEntity.status(400).body(Map.of("message", "Loại yêu cầu không hợp lệ cho thao tác này."));
        }
        return ResponseEntity.status(400).body(Map.of("message", "Yêu cầu này đã được xử lý."));
    }

    @GetMapping("/pin-reset-requests/pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingPinResets() {
        List<AccountRequest> pending = requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.RESET_PIN, RequestStatus.PENDING);
        return ResponseEntity.ok(pending.stream().map(r -> mapRequestToOldStruct(r, "PENDING")).collect(Collectors.toList()));
    }

    @GetMapping("/pin-reset-requests/history")
    public ResponseEntity<List<Map<String, Object>>> getPinResetHistory() {
        List<AccountRequest> history = requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.RESET_PIN, RequestStatus.APPROVED);
        history.addAll(requestRepository.findByRequestTypeAndStatusOrderByCreatedAtDesc(RequestType.RESET_PIN, RequestStatus.REJECTED));
        return ResponseEntity.ok(history.stream().map(r -> mapRequestToOldStruct(r, r.getStatus().name())).collect(Collectors.toList()));
    }

    @PutMapping("/pin-reset-requests/{id}/approve")
    @Transactional
    public ResponseEntity<?> approvePinReset(@PathVariable String id) {
        return approvePinRequest(id, RequestType.RESET_PIN);
    }

    @PutMapping("/pin-reset-requests/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectPinReset(@PathVariable String id) {
        return rejectPinRequest(id, RequestType.RESET_PIN);
    }

    /** Create a new staff account directly (admin action, skips approval flow) */
    @PostMapping
    public ResponseEntity<?> createStaff(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String phone = body.get("phone");
        String roleStr = body.getOrDefault("role", "STAFF");
        String pin = body.getOrDefault("pin", "123456");
        String password = body.get("password");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email không được để trống"));
        }
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email này đã được đăng ký!"));
        }
        if (employeeRepository.existsByPhone(phone)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số điện thoại này đã được sử dụng!"));
        }

        EmployeeRole empRole = resolveEmployeeRole(roleStr);

        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.getEmployee() != null && currentUser.getEmployee().getRole() == EmployeeRole.ADMIN) {
            if (empRole == EmployeeRole.ADMIN || empRole == EmployeeRole.ROOT_ADMIN) {
                return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền tạo tài khoản Quản lý. Vui lòng liên hệ Root Admin."));
            }
        }
        if (isElevatedRole(empRole) && !currentUserIsRootAdmin()) {
            return ResponseEntity.status(403).body(Map.of("message", "Chỉ Root Admin được tạo tài khoản Quản lý."));
        }
        if (isElevatedRole(empRole) && (password == null || password.isBlank())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tài khoản quản lý cần mật khẩu đăng nhập"));
        }

        Employee emp = new Employee();
        emp.setEmployeeId("EMP" + System.currentTimeMillis());
        emp.setFullName(name);
        emp.setPersonalEmail(email);
        emp.setPhone(phone);
        emp.setRole(empRole);
        emp.setStatus(EmployeeStatus.ACTIVE);
        employeeRepository.save(emp);

        User user = new User();
        user.setEmployee(emp);
        user.setEmail(email);
        if (empRole == EmployeeRole.STAFF) {
            user.setPassword(passwordEncoder.encode(pin));
        } else {
            user.setPassword(passwordEncoder.encode(password));
        }
        userRepository.save(user);

        return ResponseEntity.ok(mapUserToOldStruct(user, "APPROVED"));
    }

    /** Update staff info (name, phone, status) */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStaff(@PathVariable String id, @RequestBody Map<String, String> body) {
        Optional<User> userOpt = userRepository.findById(UUID.fromString(id));
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Nhân viên không tìm thấy"));
        }
        User user = userOpt.get();
        Employee emp = user.getEmployee();

        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.getEmployee() != null && currentUser.getEmployee().getRole() == EmployeeRole.ADMIN) {
            if (emp.getRole() == EmployeeRole.ADMIN || emp.getRole() == EmployeeRole.ROOT_ADMIN) {
                return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền chỉnh sửa tài khoản Quản lý khác."));
            }
        }
        if (isElevatedRole(emp.getRole()) && !currentUserIsRootAdmin()) {
            return ResponseEntity.status(403).body(Map.of("message", "Chỉ Root Admin được chỉnh sửa tài khoản Quản lý."));
        }

        if (body.containsKey("name")) emp.setFullName(body.get("name"));
        if (body.containsKey("phone")) {
            String newPhone = body.get("phone").trim();
            if (!newPhone.equals(emp.getPhone()) && employeeRepository.existsByPhone(newPhone)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Số điện thoại này đã được sử dụng"));
            }
            emp.setPhone(newPhone);
        }
        if (body.containsKey("email")) {
            String newEmail = body.get("email").trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email này đã được sử dụng"));
            }
            user.setEmail(newEmail);
            emp.setPersonalEmail(newEmail);
        }
        if (body.containsKey("status")) {
            try {
                emp.setStatus(statusFromUi(body.get("status")));
            } catch (IllegalArgumentException ignored) {}
        }
        if (body.containsKey("role")) {
            EmployeeRole requestedRole = resolveEmployeeRole(body.get("role"));
            if (isElevatedRole(requestedRole) && !currentUserIsRootAdmin()) {
                return ResponseEntity.status(403).body(Map.of("message", "Chỉ Root Admin được cấp quyền Quản lý."));
            }
            emp.setRole(requestedRole);
        }
        employeeRepository.save(emp);
        userRepository.save(user);
        return ResponseEntity.ok(mapUserToOldStruct(user, null));
    }

    /** Soft-delete: deactivate staff account */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable String id) {
        Optional<User> userOpt = userRepository.findById(UUID.fromString(id));
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Nhân viên không tìm thấy"));
        }
        User user = userOpt.get();
        Employee emp = user.getEmployee();

        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.getEmployee() != null && currentUser.getEmployee().getRole() == EmployeeRole.ADMIN) {
            if (emp.getRole() == EmployeeRole.ADMIN || emp.getRole() == EmployeeRole.ROOT_ADMIN) {
                return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền khóa tài khoản Quản lý khác."));
            }
        }
        if (isElevatedRole(emp.getRole()) && !currentUserIsRootAdmin()) {
            return ResponseEntity.status(403).body(Map.of("message", "Chỉ Root Admin được khóa tài khoản Quản lý."));
        }

        emp.setStatus(EmployeeStatus.RESIGNED);
        employeeRepository.save(emp);
        return ResponseEntity.ok(Map.of("message", "Đã vô hiệu hoá tài khoản nhân viên " + emp.getFullName()));
    }

    private static EmployeeRole resolveEmployeeRole(String roleStr) {
        if (roleStr == null || roleStr.isBlank()) {
            return EmployeeRole.STAFF;
        }
        String normalized = roleStr.trim().toUpperCase();
        if ("MANAGER".equals(normalized) || "QUAN_LY".equals(normalized) || "QUẢN_LÝ".equalsIgnoreCase(roleStr.trim())) {
            return EmployeeRole.ADMIN;
        }
        try {
            return EmployeeRole.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return EmployeeRole.STAFF;
        }
    }
}

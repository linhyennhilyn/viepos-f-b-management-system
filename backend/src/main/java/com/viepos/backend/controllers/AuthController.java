package com.viepos.backend.controllers;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeRole;
import com.viepos.backend.models.enums.EmployeeStatus;
import com.viepos.backend.repositories.UserRepository;
import com.viepos.backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import com.viepos.backend.models.AccountRequest;
import com.viepos.backend.models.enums.RequestStatus;
import com.viepos.backend.models.enums.RequestType;
import com.viepos.backend.repositories.AccountRequestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AuthController {

    private static final String ADMIN_REQUEST_PREFIX = "ADMIN_REQ";

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.viepos.backend.repositories.EmployeeRepository employeeRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AccountRequestRepository requestRepository;

    @PostMapping("/admin/register")
    public ResponseEntity<?> registerAdmin(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String email = request.get("email");
        String phone = request.get("phone");
        String password = request.get("password");

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email này đã được đăng ký!"));
        }
        if (employeeRepository.existsByPhone(phone)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số điện thoại này đã được sử dụng!"));
        }

        AccountRequest req = new AccountRequest();
        req.setRequestCode(ADMIN_REQUEST_PREFIX + System.currentTimeMillis());
        req.setRequestType(RequestType.REGISTER);
        req.setRequestFullName(stripLegacyRoleSuffix(name));
        req.setRequestEmail(email);
        req.setRequestPhone(phone);
        req.setRequestPinHash(passwordEncoder.encode(password));
        req.setStatus(RequestStatus.PENDING);
        requestRepository.save(req);

        return ResponseEntity.ok(Map.of("ok", true, "message", "Đăng ký thành công. Đang chờ phê duyệt."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@RequestBody Map<String, String> loginRequest) {
        String email = loginRequest.get("email");
        String password = loginRequest.get("password");
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(LocalDateTime.now())) {
                return ResponseEntity.status(423)
                        .body(Map.of("ok", false, "message", "Tài khoản bị khóa đến " + user.getLockoutUntil()));
            }
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
        } catch (Exception e) {
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
                if (user.getFailedLoginAttempts() >= 3) {
                    user.setLockoutUntil(LocalDateTime.now().plusMinutes(15));
                }
                userRepository.save(user);
            }
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Incorrect email or password"));
        }

        User user = userOpt.orElseThrow();
        if (user.getEmployee() == null) {
            return ResponseEntity.status(500).body(Map.of("ok", false, "message", "User employee record not found"));
        }

        // Luồng Quản lý: chỉ ADMIN / ROOT_ADMIN đăng nhập bằng mật khẩu (không dùng PIN)
        EmployeeRole role = user.getEmployee().getRole();
        if (role != EmployeeRole.ADMIN && role != EmployeeRole.ROOT_ADMIN) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Incorrect email or password"));
        }

        if (user.getEmployee().getStatus() != EmployeeStatus.ACTIVE) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "message", "Tài khoản của bạn đã bị vô hiệu hóa hoặc nghỉ việc."));
        }

        user.setLastLoginAt(LocalDateTime.now());
        user.setFailedLoginAttempts(0);
        user.setLockoutUntil(null);
        userRepository.save(user);

        final UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        final String jwt = jwtUtil.generateToken(userDetails);

        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        response.put("token", jwt);
        response.put("role", user.getEmployee().getRole().name());
        response.put("name", user.getEmployee().getFullName());
        response.put("id", user.getId().toString());
        return ResponseEntity.ok(response);
    }

    private static String stripLegacyRoleSuffix(String fullName) {
        if (fullName == null) {
            return null;
        }
        return fullName
                .replaceAll("\\s*\\[(ADMIN|ROOT_ADMIN)]\\s*$", "")
                .trim();
    }
}

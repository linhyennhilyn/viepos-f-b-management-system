package com.viepos.backend.security;

import com.viepos.backend.models.User;
import com.viepos.backend.models.enums.EmployeeStatus;
import com.viepos.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        if (user.getEmployee() == null || user.getEmployee().getRole() == null) {
            throw new UsernameNotFoundException("User employee record not found for email: " + email);
        }

        if (user.getEmployee().getStatus() != EmployeeStatus.ACTIVE) {
            throw new org.springframework.security.authentication.DisabledException("User account is disabled or resigned");
        }

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getEmployee().getRole().name()))
        );
    }
}

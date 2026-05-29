package com.viepos.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/ping", "/error").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/admin/register").permitAll()
                .requestMatchers("/api/staff/login", "/api/staff/register").permitAll()
                // Tự phục vụ PIN (POS)
                .requestMatchers(
                        "/api/staff/verify-pin",
                        "/api/staff/pin-change-request"
                ).hasRole("STAFF")
                .requestMatchers("/api/staff/forgot-pin").denyAll()

                // POS reads and selling/session flows.
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/categories").hasAnyRole("STAFF", "ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/cards", "/api/cards/free", "/api/cards/sessions").hasAnyRole("STAFF", "ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/cards/session", "/api/cards/release/*", "/api/cards/*/status").hasAnyRole("STAFF", "ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/cards/session/*/extend").hasAnyRole("STAFF", "ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/orders/stats").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/orders/next-id", "/api/orders", "/api/orders/*").hasAnyRole("STAFF", "ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/orders/takeaway", "/api/orders/append-items").hasAnyRole("STAFF", "ADMIN", "ROOT_ADMIN")

                // Management reads.
                .requestMatchers(
                        "/api/staff/all",
                        "/api/staff/pending",
                        "/api/staff/history/**",
                        "/api/staff/pin-change-requests/**",
                        "/api/staff/pin-reset-requests/**"
                ).hasAnyRole("ADMIN", "ROOT_ADMIN")

                // Management mutations.
                .requestMatchers(HttpMethod.PUT, "/api/staff/*/approve", "/api/staff/*/reject").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/staff").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/staff/*").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/staff/*").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/inventory/**").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/inventory/**").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/orders/*/status").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/products", "/api/categories").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/products/*", "/api/categories/*").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/products/*", "/api/categories/*").hasAnyRole("ADMIN", "ROOT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/settings/data-range").hasRole("ROOT_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/settings/data").hasRole("ROOT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/settings/export/zip").hasRole("ROOT_ADMIN")
                .anyRequest().denyAll()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
            
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*", 
            "http://127.0.0.1:*",
            "https://molten-gasket-434712-c8.web.app",
            "https://*.web.app",
            "https://vie-pos-f-b-management-system.vercel.app",
            "https://*.vercel.app",
            "https://console.cron-job.org",
            "https://*.cron-job.org"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

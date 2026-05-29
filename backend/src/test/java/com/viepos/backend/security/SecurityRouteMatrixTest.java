package com.viepos.backend.security;

import com.viepos.backend.repositories.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.io.IOException;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringJUnitConfig(SecurityRouteMatrixTest.TestConfig.class)
@WebAppConfiguration
@TestPropertySource(properties = {
        "jwt.secret=12345678901234567890123456789012",
        "jwt.expiration=3600000"
})
class SecurityRouteMatrixTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUpMockMvc() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    @WithMockUser(roles = "STAFF")
    void staffCannotAccessManagementRoutes() throws Exception {
        mockMvc.perform(get("/api/staff/all")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/staff/00000000-0000-0000-0000-000000000001/approve")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/staff")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/staff/00000000-0000-0000-0000-000000000001")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/staff/00000000-0000-0000-0000-000000000001")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/staff/pin-change-requests/00000000-0000-0000-0000-000000000001/approve")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/staff/pin-change-requests/00000000-0000-0000-0000-000000000001/reject")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/staff/pin-reset-requests/00000000-0000-0000-0000-000000000001/approve")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/staff/pin-reset-requests/00000000-0000-0000-0000-000000000001/reject")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/products")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/products/00000000-0000-0000-0000-000000000001")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/categories/00000000-0000-0000-0000-000000000001")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/inventory/transactions")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/inventory/transaction")).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/orders/00000000-0000-0000-0000-000000000001/status")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/settings/data-range")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/settings/data")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/settings/export/zip")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/internal/management")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "STAFF")
    void staffCanAccessExplicitPosRoutes() throws Exception {
        mockMvc.perform(get("/api/products")).andExpect(status().isOk());
        mockMvc.perform(get("/api/categories")).andExpect(status().isOk());
        mockMvc.perform(get("/api/cards/free")).andExpect(status().isOk());
        mockMvc.perform(post("/api/cards/session")).andExpect(status().isOk());
        mockMvc.perform(post("/api/orders/takeaway")).andExpect(status().isOk());
        mockMvc.perform(post("/api/orders/append-items")).andExpect(status().isOk());
        mockMvc.perform(post("/api/staff/verify-pin")).andExpect(status().isOk());
        mockMvc.perform(post("/api/staff/pin-change-request")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanManageOperationalDataButNotRootSettings() throws Exception {
        mockMvc.perform(get("/api/staff/all")).andExpect(status().isOk());
        mockMvc.perform(post("/api/products")).andExpect(status().isOk());
        mockMvc.perform(put("/api/categories/00000000-0000-0000-0000-000000000001")).andExpect(status().isOk());
        mockMvc.perform(post("/api/inventory/transaction")).andExpect(status().isOk());
        mockMvc.perform(get("/api/settings/data-range")).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/settings/data")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/settings/export/zip")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ROOT_ADMIN")
    void rootAdminCanAccessRootSettings() throws Exception {
        mockMvc.perform(get("/api/settings/data-range")).andExpect(status().isOk());
        mockMvc.perform(delete("/api/settings/data")).andExpect(status().isOk());
        mockMvc.perform(get("/api/settings/export/zip")).andExpect(status().isOk());
    }

    @Test
    void publicRoutesStayPublic() throws Exception {
        mockMvc.perform(get("/api/ping")).andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/login")).andExpect(status().isOk());
        mockMvc.perform(post("/api/staff/login")).andExpect(status().isOk());
        mockMvc.perform(post("/api/staff/register")).andExpect(status().isOk());
    }

    @TestConfiguration
    @EnableWebMvc
    @Import(SecurityConfig.class)
    static class TestConfig {
        @Bean
        JwtFilter jwtFilter() {
            return new JwtFilter() {
                @Override
                protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                        throws ServletException, IOException {
                    filterChain.doFilter(request, response);
                }
            };
        }

        @Bean
        JwtUtil jwtUtil() {
            return Mockito.mock(JwtUtil.class);
        }

        @Bean
        CustomUserDetailsService customUserDetailsService() {
            return Mockito.mock(CustomUserDetailsService.class);
        }

        @Bean
        UserRepository userRepository() {
            return Mockito.mock(UserRepository.class);
        }

        @Bean
        RouteMatrixController routeMatrixController() {
            return new RouteMatrixController();
        }
    }

    @RestController
    static class RouteMatrixController {
        @RequestMapping(
                path = {
                        "/api/ping",
                        "/api/auth/login",
                        "/api/staff/login",
                        "/api/staff/register",
                        "/api/staff/verify-pin",
                        "/api/staff/pin-change-request",
                        "/api/staff/all",
                        "/api/staff/{id}/approve",
                        "/api/staff/pin-change-requests/{id}/approve",
                        "/api/staff/pin-change-requests/{id}/reject",
                        "/api/staff/pin-reset-requests/{id}/approve",
                        "/api/staff/pin-reset-requests/{id}/reject",
                        "/api/staff",
                        "/api/products",
                        "/api/products/{id}",
                        "/api/categories",
                        "/api/categories/{id}",
                        "/api/inventory/transactions",
                        "/api/inventory/transaction",
                        "/api/orders/{id}/status",
                        "/api/settings/data-range",
                        "/api/settings/data",
                        "/api/settings/export/zip",
                        "/api/internal/management",
                        "/api/cards/free",
                        "/api/cards/session",
                        "/api/orders/takeaway",
                        "/api/orders/append-items"
                },
                method = {
                        RequestMethod.GET,
                        RequestMethod.POST,
                        RequestMethod.PUT,
                        RequestMethod.DELETE
                })
        String ok() {
            return "ok";
        }
    }
}

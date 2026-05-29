package com.viepos.backend;

import com.viepos.backend.models.Employee;
import com.viepos.backend.models.User;
import com.viepos.backend.repositories.CategoryRepository;
import com.viepos.backend.repositories.EmployeeRepository;
import com.viepos.backend.repositories.ProductRepository;
import com.viepos.backend.repositories.ServiceCardRepository;
import com.viepos.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {

    private final DataSeeder dataSeeder = new DataSeeder();

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ServiceCardRepository cardRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private Environment environment;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(dataSeeder, "categoryRepository", categoryRepository);
        ReflectionTestUtils.setField(dataSeeder, "productRepository", productRepository);
        ReflectionTestUtils.setField(dataSeeder, "cardRepository", cardRepository);
        ReflectionTestUtils.setField(dataSeeder, "employeeRepository", employeeRepository);
        ReflectionTestUtils.setField(dataSeeder, "userRepository", userRepository);
        ReflectionTestUtils.setField(dataSeeder, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(dataSeeder, "environment", environment);

        when(categoryRepository.count()).thenReturn(1L);
        when(cardRepository.count()).thenReturn(1L);
    }

    @Test
    void nonLocalProfileDoesNotCreateBootstrapRootUser() throws Exception {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        dataSeeder.run();

        verify(employeeRepository, never()).existsByEmployeeId(any());
        verify(employeeRepository, never()).save(any(Employee.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void localProfileCreatesBootstrapRootUserOnlyFromEnvironmentValues() throws Exception {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"local"});
        when(environment.getProperty("VIEPOS_BOOTSTRAP_ROOT_ENABLED", "false")).thenReturn("true");
        when(environment.getProperty("VIEPOS_BOOTSTRAP_ROOT_EMPLOYEE_ID")).thenReturn("ROOT-1");
        when(environment.getProperty("VIEPOS_BOOTSTRAP_ROOT_EMAIL")).thenReturn("root@example.test");
        when(environment.getProperty("VIEPOS_BOOTSTRAP_ROOT_PASSWORD")).thenReturn("one-time-password");
        when(environment.getProperty("VIEPOS_BOOTSTRAP_ROOT_FULL_NAME")).thenReturn("Root Bootstrap");
        when(environment.getProperty("VIEPOS_BOOTSTRAP_ROOT_PHONE")).thenReturn("0000000000");
        when(employeeRepository.existsByEmployeeId("ROOT-1")).thenReturn(false);
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode("one-time-password")).thenReturn("encoded-password");

        dataSeeder.run();

        ArgumentCaptor<Employee> employeeCaptor = ArgumentCaptor.forClass(Employee.class);
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(employeeRepository).save(employeeCaptor.capture());
        verify(userRepository).save(userCaptor.capture());

        assertThat(employeeCaptor.getValue().getEmployeeId()).isEqualTo("ROOT-1");
        assertThat(employeeCaptor.getValue().getPersonalEmail()).isEqualTo("root@example.test");
        assertThat(userCaptor.getValue().getEmail()).isEqualTo("root@example.test");
        assertThat(userCaptor.getValue().getPassword()).isEqualTo("encoded-password");
    }
}

package com.viepos.backend;

import com.viepos.backend.models.*;
import com.viepos.backend.models.enums.*;
import com.viepos.backend.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ServiceCardRepository cardRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private Environment environment;

    @Override
    public void run(String... args) throws Exception {
        seedBootstrapRootAdmin();

        // Seed Categories
        if (categoryRepository.count() == 0) {
            Category c1 = categoryRepository.save(new Category(null, "CAT001", "Cà phê", null, null, new BigDecimal("25000"), new BigDecimal("35000"), new BigDecimal("45000"), 1, true, null, null));
            Category c2 = categoryRepository.save(new Category(null, "CAT002", "Trà sữa", null, null, new BigDecimal("25000"), new BigDecimal("35000"), new BigDecimal("45000"), 2, true, null, null));
            Category c3 = categoryRepository.save(new Category(null, "CAT003", "Nước ép", null, null, new BigDecimal("35000"), new BigDecimal("45000"), new BigDecimal("55000"), 3, true, null, null));
            Category c4 = categoryRepository.save(new Category(null, "CAT004", "Trà", null, null, new BigDecimal("30000"), new BigDecimal("40000"), new BigDecimal("50000"), 4, true, null, null));
            Category c5 = categoryRepository.save(new Category(null, "CAT005", "Ăn vặt", null, null, new BigDecimal("15000"), new BigDecimal("15000"), new BigDecimal("15000"), 5, true, null, null));
            Category c6 = categoryRepository.save(new Category(null, "CAT006", "Khác", null, null, new BigDecimal("0"), new BigDecimal("0"), new BigDecimal("0"), 99, true, null, null));

            // Seed Products
            if (productRepository.count() == 0) {
                // Cà phê
                productRepository.save(createProduct("PRD001", "CF-DEN-01", c1, "Cà phê đen", new BigDecimal("25000"), new BigDecimal("35000"), new BigDecimal("45000")));
                productRepository.save(createProduct("PRD002", "CF-SUA-02", c1, "Cà phê sữa", new BigDecimal("25000"), new BigDecimal("35000"), new BigDecimal("45000")));

                // Trà sữa
                productRepository.save(createProduct("PRD003", "TS-DAC-01", c2, "Trà sữa đặc sản", new BigDecimal("25000"), new BigDecimal("35000"), new BigDecimal("45000")));
                productRepository.save(createProduct("PRD004", "TS-TRU-02", c2, "Trà sữa truyền thống", new BigDecimal("25000"), new BigDecimal("35000"), new BigDecimal("45000")));

                // Nước ép
                productRepository.save(createProduct("PRD005", "NE-DEP-01", c3, "Nước ép cam", new BigDecimal("35000"), new BigDecimal("45000"), new BigDecimal("55000")));
                productRepository.save(createProduct("PRD006", "NE-DAN-02", c3, "Nước ép táo", new BigDecimal("35000"), new BigDecimal("45000"), new BigDecimal("55000")));

                // Trà
                productRepository.save(createProduct("PRD007", "TR-NHT-01", c4, "Trà nhiệt đới", new BigDecimal("30000"), new BigDecimal("40000"), new BigDecimal("50000")));
                productRepository.save(createProduct("PRD008", "TR-MAN-02", c4, "Trà mãng cầu", new BigDecimal("30000"), new BigDecimal("40000"), new BigDecimal("50000")));
                productRepository.save(createProduct("PRD009", "TR-OIH-03", c4, "Trà ổi hồng", new BigDecimal("30000"), new BigDecimal("40000"), new BigDecimal("50000")));

                // Ăn vặt
                productRepository.save(createProduct("PRD010", "AV-HD-01", c5, "Hạt hướng dương", new BigDecimal("15000"), new BigDecimal("15000"), new BigDecimal("15000")));
                productRepository.save(createProduct("PRD011", "AV-KG-02", c5, "Khô gà", new BigDecimal("15000"), new BigDecimal("15000"), new BigDecimal("15000")));
            }
        }

        // Seed Cards
        if (cardRepository.count() == 0) {
            for (int i = 1; i <= 12; i++) {
                String code = String.format("CARD%03d", i);
                ServiceCard card = new ServiceCard();
                card.setCardCode(code);
                card.setCardType(CardType.PHYSICAL);
                card.setStatus(CardStatus.AVAILABLE);
                cardRepository.save(card);
            }
        }

    }

    private void seedBootstrapRootAdmin() {
        if (!isRootBootstrapEnabled()) {
            return;
        }

        String employeeId = requiredBootstrapValue("VIEPOS_BOOTSTRAP_ROOT_EMPLOYEE_ID");
        if (employeeRepository.existsByEmployeeId(employeeId)) {
            return;
        }

        String email = requiredBootstrapValue("VIEPOS_BOOTSTRAP_ROOT_EMAIL");
        String password = requiredBootstrapValue("VIEPOS_BOOTSTRAP_ROOT_PASSWORD");

        Employee rootAdmin = new Employee();
        rootAdmin.setEmployeeId(employeeId);
        rootAdmin.setFullName(requiredBootstrapValue("VIEPOS_BOOTSTRAP_ROOT_FULL_NAME"));
        rootAdmin.setPersonalEmail(email);
        rootAdmin.setPhone(requiredBootstrapValue("VIEPOS_BOOTSTRAP_ROOT_PHONE"));
        rootAdmin.setRole(EmployeeRole.ROOT_ADMIN);
        rootAdmin.setStatus(EmployeeStatus.ACTIVE);
        employeeRepository.save(rootAdmin);

        User rootUser = new User();
        rootUser.setEmployee(rootAdmin);
        rootUser.setEmail(email);
        rootUser.setPassword(passwordEncoder.encode(password));
        userRepository.save(rootUser);
    }

    private boolean isRootBootstrapEnabled() {
        if (!hasActiveProfile("local") && !hasActiveProfile("bootstrap")) {
            return false;
        }
        return Boolean.parseBoolean(environment.getProperty("VIEPOS_BOOTSTRAP_ROOT_ENABLED", "false"));
    }

    private boolean hasActiveProfile(String profile) {
        return Arrays.asList(environment.getActiveProfiles()).contains(profile);
    }

    private String requiredBootstrapValue(String key) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required root bootstrap value: " + key);
        }
        return value;
    }

    private Product createProduct(String pCode, String sku, Category cat, String name, BigDecimal pt, BigDecimal p4, BigDecimal pf) {
        Product p = new Product();
        p.setProductCode(pCode);
        p.setSku(sku);
        p.setCategory(cat);
        p.setName(name);
        p.setPriceTakeaway(pt);
        p.setPricePackage4h(p4);
        p.setPricePackageFullday(pf);
        p.setUnit("ly");
        p.setCurrentStock(new BigDecimal("100"));
        p.setMinimumStock(new BigDecimal("10"));
        p.setIsActive(true);
        p.setIsOutOfStock(false);
        p.setCostPrice(BigDecimal.ZERO);
        return p;
    }
}

package com.viepos.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class RuntimeSecretValidatorTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(RuntimeSecretValidator.class);

    @Test
    void nonLocalProfileFailsWhenRequiredSecretsAreMissing() {
        contextRunner
                .withPropertyValues("spring.profiles.active=prod")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessageContaining("SPRING_DATASOURCE_URL")
                            .hasMessageContaining("JWT_SECRET");
                });
    }

    @Test
    void localProfileAllowsMissingDeploymentSecrets() {
        contextRunner
                .withPropertyValues("spring.profiles.active=local")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void nonLocalProfileStartsWhenRequiredSecretsAreProvided() {
        contextRunner
                .withPropertyValues(
                        "spring.profiles.active=prod",
                        "spring.datasource.url=jdbc:postgresql://db.example.com:5432/viepos",
                        "spring.datasource.username=viepos_app",
                        "spring.datasource.password=not-a-real-password",
                        "jwt.secret=12345678901234567890123456789012")
                .run(context -> assertThat(context).hasNotFailed());
    }
}

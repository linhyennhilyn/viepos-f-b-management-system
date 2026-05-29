package com.viepos.backend.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class RuntimeSecretValidator implements BeanFactoryPostProcessor, EnvironmentAware {

    private static final List<RequiredProperty> REQUIRED_PROPERTIES = List.of(
            new RequiredProperty("spring.datasource.url", "SPRING_DATASOURCE_URL"),
            new RequiredProperty("spring.datasource.username", "SPRING_DATASOURCE_USERNAME"),
            new RequiredProperty("spring.datasource.password", "SPRING_DATASOURCE_PASSWORD"),
            new RequiredProperty("jwt.secret", "JWT_SECRET")
    );

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        if (hasActiveProfile("local") || hasActiveProfile("bootstrap")) {
            return;
        }

        List<String> missing = new ArrayList<>();
        for (RequiredProperty property : REQUIRED_PROPERTIES) {
            String value = environment.getProperty(property.key());
            if (isBlank(value) || value.contains("${")) {
                missing.add(property.envName());
            }
        }

        if (!missing.isEmpty()) {
            throw new IllegalStateException("Missing required deployment secrets: " + String.join(", ", missing));
        }
    }

    private boolean hasActiveProfile(String profile) {
        return Arrays.asList(environment.getActiveProfiles()).contains(profile);
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record RequiredProperty(String key, String envName) {
    }
}

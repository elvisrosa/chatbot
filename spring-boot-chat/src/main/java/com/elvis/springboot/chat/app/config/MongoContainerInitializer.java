package com.elvis.springboot.chat.app.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.utility.DockerImageName;
import java.util.HashMap;
import java.util.Map;

@Slf4j
public class MongoContainerInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final MongoDBContainer mongoContainer =
            new MongoDBContainer(DockerImageName.parse("mongo:6.0.5"))
            .withExposedPorts(27017) // Exponer el puerto 27017
            .withEnv("MONGO_INITDB_ROOT_USERNAME", "admin") // Establecer el usuario root
            .withEnv("MONGO_INITDB_ROOT_PASSWORD", "secret") // Establecer la contraseña
            .withEnv("MONGO_INITDB_DATABASE", "chatapp"); // Establecer la base de datos por defecto

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {

        log.info("Checking if Docker is available...");

        if (!isDockerActive()) {
            log.warn("Docker is not available. Skipping MongoDB container initialization.");
            return;
        }

        if (!mongoContainer.isRunning()) {
            log.info("Starting MongoDB Testcontainer...");
            mongoContainer.start();
        }

        log.info("MongoDB container started at: {}", mongoContainer.getReplicaSetUrl());

        ConfigurableEnvironment environment = applicationContext.getEnvironment();
        Map<String, Object> props = new HashMap<>();
        props.put("spring.data.mongodb.uri", mongoContainer.getReplicaSetUrl());
        environment.getPropertySources().addFirst(new MapPropertySource("mongoContainerProps", props));
    }

    private boolean isDockerActive() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Exception e) {
            log.error("Error checking Docker availability: {}", e.getMessage());
            return false;
        }
    }
}

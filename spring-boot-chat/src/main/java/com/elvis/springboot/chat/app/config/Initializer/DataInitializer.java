package com.elvis.springboot.chat.app.config.Initializer;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

// @Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public CommandLineRunner init() {
        return args -> {
            if(!userRepository.findByUsername("test").isPresent()) {
                User user = new User();
                userRepository.save(user);
                System.out.println("Users initialized: " + user);
            }
        };
    }
       
    
}

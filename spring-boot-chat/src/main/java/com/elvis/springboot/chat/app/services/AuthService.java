package com.elvis.springboot.chat.app.services;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.jwt.utils.JwtUtil;
import com.elvis.springboot.chat.app.messagues.requests.Login;
import com.elvis.springboot.chat.app.messagues.response.Response;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AuthService {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    public boolean authenticate(String username, String password) {
        return "user".equals(username) && "password".equals(password);
    }

    public Response login(Login loginRequest) {
        String username = loginRequest.getUsername();
        String password = loginRequest.getPassword();
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isEmpty()) {
            return new Response(HttpStatus.UNAUTHORIZED.value(), "User or password incorrect");
        }
        log.info(user.get().getFullName());

        if (!encoder.matches(password, user.get().getPassword())) {
            return new Response(HttpStatus.UNAUTHORIZED.value(), "User or password incorrect");
        }
        String token = jwtUtil.generateToken(username);
        return new Response(HttpStatus.OK.value(), "Login successful", token);

    }

}

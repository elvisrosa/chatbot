package com.elvis.springboot.chat.app.controllers;

import java.security.Principal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.testcontainers.shaded.org.checkerframework.checker.units.qual.s;

import com.elvis.springboot.chat.app.messagues.requests.Login;
import com.elvis.springboot.chat.app.messagues.response.Response;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import com.elvis.springboot.chat.app.services.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/anon")
    public ResponseEntity<Response> authenticateUser(@RequestBody Login loginRequest) {
        Response resp = authService.login(loginRequest);
        return ResponseEntity.status(resp.getStatusCode()).body(resp);
    }

    @GetMapping("/load/me/user")
    public ResponseEntity<Response> loadUserAutenticated(Principal principal) {
        String username = null != principal ? principal.getName() : null;
        if (username == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new Response(401, "Not authenticated"));
        }
        Response resp = authService.loadUserByUsername(username);
        return ResponseEntity.status(resp.getStatusCode()).body(resp);
    }

}

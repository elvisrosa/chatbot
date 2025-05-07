package com.elvis.springboot.chat.app.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.elvis.springboot.chat.app.messagues.requests.Login;
import com.elvis.springboot.chat.app.messagues.response.Response;
import com.elvis.springboot.chat.app.services.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/anon")
    public ResponseEntity<?> authenticateUser(@RequestBody Login loginRequest) {
        Response resp = authService.login(loginRequest);
        return ResponseEntity.status(resp.getStatusCode()).body(resp);
    }

}

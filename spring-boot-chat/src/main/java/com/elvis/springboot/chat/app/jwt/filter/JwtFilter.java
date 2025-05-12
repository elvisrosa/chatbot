package com.elvis.springboot.chat.app.jwt.filter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.jwt.utils.JwtUtil;
import com.elvis.springboot.chat.app.messagues.response.Response;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        log.info("Entro al fitro de autenticacion para ruta : {}", request.getRequestURI());
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        log.info("HEader {}", authHeader);
        String jwt = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        }
        log.info("Token {}", jwt);

        if (jwt != null && jwtUtil.validateToken(jwt)) {
            log.info("Entro a validar el token");
            String username = jwtUtil.extractUsername(jwt);
            User user = userRepository.findByUsername(username).orElse(null);
            log.info("USer encontrado {}", user);
            if (user == null) {
                Response errorResponse = new Response(HttpStatus.UNAUTHORIZED.value(), "User not found");
                response.setContentType("application/json");
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.getWriter()
                        .write(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(errorResponse));
                return;
            }
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user.getUsername(),
                    null,
                    List.of());
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.info("Usaurio autenticado {}", auth);
        }
        filterChain.doFilter(request, response);
    }

}

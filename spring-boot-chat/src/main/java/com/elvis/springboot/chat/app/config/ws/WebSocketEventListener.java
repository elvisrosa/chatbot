package com.elvis.springboot.chat.app.config.ws;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final UserRepository userRepository;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        log.info(event.getMessage().toString());
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = accessor.getUser() != null ? accessor.getUser().getName() : null;
        log.info("Entro el usuario {} a la conexion websocket a la hora {}", username, LocalDateTime.now());
        if (username != null) {
            Optional<User> userOpt = userRepository.findByUsername(username);
            userOpt.ifPresent(user -> {
                user.setLastSeen(LocalDateTime.now());
                userRepository.save(user);
            });
        }
    }

}

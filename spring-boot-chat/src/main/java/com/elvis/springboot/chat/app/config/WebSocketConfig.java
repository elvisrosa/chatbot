package com.elvis.springboot.chat.app.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtHandshakeInterceptor jwtHandshakeInterceptor;

    /**
     * Configure the message broker for WebSocket communication.
     * This method sets up the message broker with a simple in-memory broker
     * and specifies the prefixes for application destinations and message broker
     * destinations.
     *
     * @param config the MessageBrokerRegistry to configure the message broker
     */

    /**
     * Ruta para conectar el cliente al servidor WebSocket.
     * Se permite el uso de SockJS como fallback para navegadores que no soportan
     * WebSocket.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/chat-websocket").setAllowedOrigins("http://localhost:4200")
        .addInterceptors(jwtHandshakeInterceptor).withSockJS();
    }

    /**
     * Configura el broker de mensajes para la comunicación WebSocket.
     * Se habilita un broker simple en memoria y se establecen los prefijos
     * para los destinos de la aplicación y del broker de mensajes.
     *
     * @param config el MessageBrokerRegistry para configurar el broker de mensajes
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic/", "/queue/", "/chatroom/");
        config.setUserDestinationPrefix("/user");
        config.setApplicationDestinationPrefixes("/app");
        // config.setUserDestinationPrefix("/secured/user");

    }

}

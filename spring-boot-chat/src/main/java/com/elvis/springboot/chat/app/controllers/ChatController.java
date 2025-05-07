package com.elvis.springboot.chat.app.controllers;

import java.security.Principal;
import java.util.Date;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import com.elvis.springboot.chat.app.documents.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Slf4j
@Controller
@RequestMapping("/api")
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/info")
    @ResponseBody
    public String saludar() {
        return "Hola desde el backend";
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload Message message, Principal principal) {
        message.setSender(principal.getName());
        messagingTemplate.convertAndSendToUser(
                message.getSender(),
                "/queue/messages",
                message);
    }

    @MessageMapping("/chat.newUser")
    @SendTo("/topic/messages")
    public Message newUser(Message message) {
        message.setContent("New user connected: " + message.getSender());
        return message;
    }

}

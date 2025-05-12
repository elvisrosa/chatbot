package com.elvis.springboot.chat.app.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import org.bson.types.ObjectId;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import com.elvis.springboot.chat.app.documents.Contact;
import com.elvis.springboot.chat.app.documents.Content;
import com.elvis.springboot.chat.app.documents.Messages;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.messagues.requests.Message;
import com.elvis.springboot.chat.app.messagues.response.MessagesDto;
import com.elvis.springboot.chat.app.repositories.MessagesRepository;
import com.elvis.springboot.chat.app.repositories.UserRepository;

@Slf4j
@RequiredArgsConstructor
@Controller
@RequestMapping("/api")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessagesRepository messagesRepository;
    private final UserRepository userRepository;

    @GetMapping("/info")
    @ResponseBody
    public String saludar() {
        return "Hola desde el backend";
    }

    @MessageMapping("/chat.send") // cliente envia a /app/chat.send
    public void sendMessage(@Payload Message message, Principal principal) {
        if (principal == null) {
            log.error("No se pudo obtener el usuario");
            return;
        }

        log.info("Data del mensaje que llega {}", message);
        User currentUser = userRepository.findByUsername(principal.getName()).orElse(null);
        ObjectId currentUserid = currentUser == null ? null : currentUser.getId();
        ObjectId receiverId = new ObjectId(message.getTo());
        User receiverUser = userRepository.findById(receiverId).orElse(null);

        boolean alreadyExists = false;
        boolean isContact = false;

        for (Contact contact : receiverUser.getContacts()) {
            if (contact.getUserId().equals(currentUserid)) {
                alreadyExists = true;
                if ("contact".equals(contact.getStatus())) {
                    isContact = true;
                }
                break; // Ya no hace falta seguir buscando
            }
        }

        log.info("Es un contacto ? {} existe ? {}", isContact, alreadyExists);

        String status = isContact ? "send" : "pendig_acceptance";

        if (!alreadyExists) {
            Contact contactPending = Contact.builder().status("pendig_acceptance")
                    .isBlocked(false)
                    .nickname(currentUser.getName())
                    .userId(currentUserid)
                    .build();
            receiverUser.getContacts().add(contactPending);
            userRepository.save(receiverUser);
        }

        Content content = Content.builder()
                .type("text")
                .body(message.getContent())
                .mediaUrl("http://ejemplo.com").build();
        Messages messageDoc = Messages.builder()
                .receiverId(receiverId)
                .senderId(currentUserid)
                .edit(false)
                .isGroupMessage(false)
                .status(status)
                .timestamp(LocalDateTime.now())
                .content(content).build();
        messagesRepository.save(messageDoc);
        log.info("Mensaje de {} para {}", principal.getName(), receiverUser.getUsername());
        messagingTemplate.convertAndSendToUser(
                receiverUser.getUsername(), // Destinatario
                "/queue/messages",
                new MessagesDto(messageDoc));
        messagingTemplate.convertAndSendToUser(
                currentUser.getUsername(), // Destinatario
                "/queue/messages",
                new MessagesDto(messageDoc));
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload Message message, Principal principal) {
        if (principal == null)
            return;
        User sender = userRepository.findByUsername(principal.getName()).orElse(null);
        if (sender == null)
            return;
        Message messageDoc = Message.builder().from(sender.getId().toHexString()).to(message.getTo())
                .type(message.getType()).build();
        messagingTemplate.convertAndSendToUser(
                message.getTo(), "/queue/typing",
                messageDoc);
    }

}

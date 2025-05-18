package com.elvis.springboot.chat.app.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Controller;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import com.elvis.springboot.chat.app.documents.Contact;
import com.elvis.springboot.chat.app.documents.Content;
import com.elvis.springboot.chat.app.documents.Messages;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.messagues.requests.ContactUpdateDto;
import com.elvis.springboot.chat.app.messagues.requests.Message;
import com.elvis.springboot.chat.app.messagues.response.MessagesDto;
import com.elvis.springboot.chat.app.messagues.response.UserDto;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import com.elvis.springboot.chat.app.services.ContactService;
import com.elvis.springboot.chat.app.services.MessageService;

@Slf4j
@RequiredArgsConstructor
@Controller
@RequestMapping("/api")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final UserRepository userRepository;
    private final ContactService contactService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload Message message, Principal principal) {
        if (principal == null) {
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
                break;
            }
        }

        log.info("Es un contacto ? {} existe ? {}", isContact, alreadyExists);

        String status = isContact ? "read" : "pendig_acceptance";

        if (!isContact) {
            int messagesPendint = messageService.countBySenderIdAndReceiverIdAndStatus(
                    currentUserid, receiverId, "pendig_acceptance");
            if (messagesPendint > 2) {
                messagingTemplate.convertAndSendToUser(
                        receiverUser.getUsername(),
                        "/queue/messages",
                        new MessagesDto(Messages.builder().build()));
                return;
            }
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
        messageService.save(messageDoc);
        log.info("Mensaje de {} para {}", principal.getName(), receiverUser.getUsername());
        messagingTemplate.convertAndSendToUser(
                receiverUser.getUsername(), // Destinatario
                "/queue/messages",
                new MessagesDto(messageDoc));
        messagingTemplate.convertAndSendToUser(
                currentUser.getUsername(), // Destinatario
                "/queue/messages",
                new MessagesDto(messageDoc));

        if (!alreadyExists) {
            Contact contactPending = Contact.builder()
                    .status("pendig_acceptance")
                    .isBlocked(false)
                    .nickname(currentUser.getName())
                    .userId(currentUserid)
                    .unreadMessages(1)
                    .build();
            receiverUser.getContacts().add(contactPending);
            User userCreated = userRepository.save(receiverUser);
            log.info("User creaddo {}", userCreated);
            UserDto newUser = new UserDto(currentUser, "pendig_acceptance", contactPending.getUnreadMessages(), null);
            messagingTemplate.convertAndSendToUser(
                    receiverUser.getUsername(),
                    "/queue/new_contact",
                    newUser);
        }
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

    @MessageMapping("/contact.update")
    public void updateContactStatus(@Payload ContactUpdateDto contactUpdateDto, Principal principal) {
        if (principal == null || principal.getName() == null) {
            return;
        }

        try {
            contactService.processContactUpdate(principal.getName(), contactUpdateDto);

            // Las notificaciones post-actualización podrían hacerse aquí si son de
            // "presentación"
            // o dentro del servicio si son parte de la lógica de negocio central
            // messagingTemplate.convertAndSendToUser(..., contactUpdateDto);
            // messagingTemplate.convertAndSendToUser(..., contactUpdateDto);

        } catch (UsernameNotFoundException e) {
            log.warn("Fallo en la actualización de contacto: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Error inesperado al actualizar contacto: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/me/mark-as-read")
    public void markMessagesAsRead(@RequestBody List<String> messageIds, Principal principal) {

        if (principal == null || principal.getName() == null) {
            return;
        }
        final String username = principal.getName();
        User currentUser = userRepository.findByUsername(username).orElseGet(() -> {
            log.warn("Usuario {} no encontrado al intentar marcar mensajes como leídos.", username);
            return null;
        });

        if (currentUser == null) {
            return;
        }

        List<ObjectId> objectMessageIds = messageIds.stream()
                .map(id -> {
                    try {
                        return new ObjectId(id);
                    } catch (Exception e) {
                        log.warn("ID de mensaje inválido: {}. Será ignorado.", id);
                        return null;
                    }
                }).filter(Objects::nonNull)
                .toList();
        if (objectMessageIds.isEmpty()) {
            return;
        }

        List<Messages> messagesToUpdate = messageService.findMessagesBetweenUsersWithIds(currentUser.getId(),
                objectMessageIds);
        if (messagesToUpdate.isEmpty()) {
            log.info(
                    "No se encontraron mensajes elegibles para actualizar para el usuario {} con los IDs proporcionados.",
                    username);
            return;
        }
        log.info("Se encontraron {} mensajes para marcar como leídos para el usuario {}.", messagesToUpdate.size(),
                username);

        messagesToUpdate.forEach(message -> message.setStatus("read"));
        List<Messages> updatedMessages = messageService.saveAll(messagesToUpdate);
        if (updatedMessages.isEmpty()) {
            log.warn("Ningún mensaje fue guardado después de intentar marcar como leídos para el usuario {}.",
                    username);
            return;
        }

        List<ObjectId> messagesIdRead = updatedMessages.stream()
                .map(Messages::getId)
                .toList();

        String receiverUsername = updatedMessages.stream()
                .map(Messages::getReceiverId)
                .findFirst()
                .flatMap(userRepository::findById)
                .map(User::getUsername)
                .orElseGet(() -> {
                    log.error(
                            "No se pudo determinar el nombre de usuario del receptor para los mensajes leídos. Esto es inesperado.");
                    return null;
                });

        messagingTemplate.convertAndSendToUser(
                username,
                "/queue/message-read",
                messagesIdRead);

        if (receiverUsername != null && !receiverUsername.equals(username)) {
            messagingTemplate.convertAndSendToUser(
                    receiverUsername,
                    "/queue/message-read",
                    messagesIdRead);
        }

    }

}

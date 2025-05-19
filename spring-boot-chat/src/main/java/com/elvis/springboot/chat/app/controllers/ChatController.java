package com.elvis.springboot.chat.app.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

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
import org.springframework.web.bind.annotation.RequestParam;

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

        if (principal == null || principal.getName() == null) {
            return;
        }

        String username = principal.getName();

        User senderUser = userRepository.findByUsername(username)
                .orElseThrow(
                        () -> new IllegalStateException("Remitente no encontrado con username: " + username));
        ObjectId receiverId = null;
        try {
            receiverId = new ObjectId(message.getTo());
        } catch (IllegalArgumentException e) {
            log.error("ID de destinatario inválido: {}", message.getTo());
            return;
        }

        User receiverUser = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalStateException("Destinatario no encontrado"));

        boolean isContact = receiverUser.getContacts().stream()
                .anyMatch(contact -> contact.getUserId().equals(senderUser.getId())
                        && "contact".equals(contact.getStatus()));

        log.info("Es un contacto ? {}", isContact);

        String status = isContact ? "send" : "pending_acceptance";

        if (!isContact) {
            long pendingMessagesCount = messageService.countBySenderIdAndReceiverIdAndStatus(
                    senderUser.getId(), receiverId, "pending_acceptance");
            if (pendingMessagesCount >= 2) {
                log.warn("Límite de mensajes pendientes alcanzado de {} a {}", username,
                        receiverUser.getUsername());
                // messagingTemplate.convertAndSendToUser(username, "/queue/errors",
                // new Response<>(HttpStatus.TOO_MANY_REQUESTS.value(),
                // "Demasiadas solicitudes de contacto pendientes a este usuario."));
                return;
            }
        }

        Content content = Content.builder().type("text").body(message.getContent()).mediaUrl("http://ejemplo.com")
                .build();
        Messages messageDoc = Messages.builder().receiverId(receiverId).senderId(senderUser.getId()).edit(false)
                .isGroupMessage(false).status(status).timestamp(LocalDateTime.now()).content(content).build();
        messageService.save(messageDoc);
        log.info("Mensaje de {} para {} (status: {})", username, receiverUser.getUsername(), status);

        messagingTemplate.convertAndSendToUser(receiverUser.getUsername(), "/queue/messages",
                new MessagesDto(messageDoc));
        messagingTemplate.convertAndSendToUser(senderUser.getUsername(), "/queue/messages",
                new MessagesDto(messageDoc));

        boolean alreadyContactRequestExists = receiverUser.getContacts().stream()
                .anyMatch(contact -> contact.getUserId().equals(senderUser.getId()));

        if (!alreadyContactRequestExists) {
            Contact contactPending = Contact.builder()
                    .status("pending_acceptance")
                    .isBlocked(false)
                    .nickname(senderUser.getName())
                    .userId(senderUser.getId())
                    .unreadMessages(1)
                    .build();
            receiverUser.getContacts().add(contactPending);
            userRepository.save(receiverUser);
            log.info("Solicitud de contacto pendiente creada de {} para {}", username,
                    receiverUser.getUsername());

            UserDto newUserDto = new UserDto(senderUser, "pending_acceptance", contactPending.getUnreadMessages(),
                    null);
            messagingTemplate.convertAndSendToUser(receiverUser.getUsername(), "/queue/new_contact", newUserDto);
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
    public void markMessagesAsRead(@RequestBody List<String> messageIds,
            Principal principal) {

        log.info("Entro a marcar mensajes como leidos {}", messageIds);
        if (principal == null || principal.getName() == null) {
            return;
        }
        final String username = principal.getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

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
                    "No se encontraron mensajes elegibles para actualizar para el usuario {} con los IDs proporcionados. {}",
                    username, objectMessageIds);
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

        List<String> messagesIdRead = updatedMessages.stream()
                .map((rep) -> rep.getId().toHexString()).toList();

        String receiverUsername = updatedMessages.stream()
                .map(Messages::getSenderId)
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
        log.info("Se enviar notificación de mensaje leido a {} y a {}",  username, receiverUsername);
        if (receiverUsername != null && !receiverUsername.equals(username)) {
            messagingTemplate.convertAndSendToUser(
                    receiverUsername,
                    "/queue/message-read",
                    messagesIdRead);
        }



    }

}

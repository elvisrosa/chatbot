package com.elvis.springboot.chat.app.controllers;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import com.elvis.springboot.chat.app.documents.Contact;
import com.elvis.springboot.chat.app.documents.Content;
import com.elvis.springboot.chat.app.documents.Messages;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.messagues.requests.ContactUpdateDto;
import com.elvis.springboot.chat.app.messagues.requests.Message;
import com.elvis.springboot.chat.app.messagues.response.MessagesDto;
import com.elvis.springboot.chat.app.messagues.response.UserDto;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import com.elvis.springboot.chat.app.services.MessageService;

@Slf4j
@RequiredArgsConstructor
@Controller
@RequestMapping("/api")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final UserRepository userRepository;

    @GetMapping("/info")
    @ResponseBody
    public String saludar() {
        return "Hola desde el backend";
    }

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

        String status = isContact ? "send" : "pendig_acceptance";

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
                    .build();
            receiverUser.getContacts().add(contactPending);
            User userCreated = userRepository.save(receiverUser);
            log.info("User creaddo {}", userCreated);
            UserDto newUser = new UserDto(currentUser, "pendig_acceptance");
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
    public void updateContactStatuts(@Payload ContactUpdateDto contact, Principal principal) {

        log.info("Entro al metodo");
        User currentUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (currentUser == null) {
            log.info("No existe el usuario");
            return;
        }

        User contactUser = userRepository.findById(new ObjectId(contact.getContactId())).orElse(null);
        if (contactUser == null) {
            log.info("No existe el usuario");
            return;
        }

        Contact contactToUpdate = currentUser.getContacts().stream()
                .filter(c -> c.getUserId().toHexString().equals(contact.getContactId()))
                .findFirst()
                .orElse(null);

        if (contactToUpdate == null) {
            log.info("No existe el contacto");
            return;
        }

        if (contact.getStatus().equalsIgnoreCase("contact")) {
            contactToUpdate.setStatus("contact");
        } else if (contact.getStatus().equalsIgnoreCase("reject")) {
            currentUser.getContacts().remove(contactToUpdate);
        } else {
            log.info("Estado  no valido {}", contact.getStatus());
            return;
        }

        if (userRepository.save(currentUser) == null) {
            return;
        }

        Sort sortByTimestamp = Sort.by(Sort.Direction.DESC, "timestamp");

        List<Messages> msgs = this.messageService.findMessages(currentUser.getId(), contactUser.getId(),
                "pendig_acceptance", 0, 10, sortByTimestamp);
        msgs.forEach(msg -> msg.setStatus("send"));
        log.info("Contacto de usuario actualizado ");
        messageService.saveAll(msgs);
        messagingTemplate.convertAndSendToUser(
                contactUser.getUsername(),
                "/queue/contact-updated",
                true);

        messagingTemplate.convertAndSendToUser(
                currentUser.getUsername(),
                "/queue/contact-updated",
                true);
        log.info("Se notifico a los usuarios {}, {}", contactUser.getUsername(), currentUser.getUsername());

    }
}

package com.elvis.springboot.chat.app.controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.elvis.springboot.chat.app.documents.Contact;
import com.elvis.springboot.chat.app.documents.Messages;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.messagues.response.MessagesDto;
import com.elvis.springboot.chat.app.messagues.response.UserDto;
import com.elvis.springboot.chat.app.repositories.MessagesRepository;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import com.elvis.springboot.chat.app.services.MessageService;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.security.Principal;
import org.bson.types.ObjectId;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/er")
public class WebController {

    private final UserRepository userRepository;
    private final MessageService messageService;

    @GetMapping("/me/contacts")
    public ResponseEntity<List<UserDto>> getMyContacts(Principal principal) {
        String username = null != principal ? principal.getName() : null;
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        log.info("Usuario encontrado con id {}", currentUser.toString());
        Map<ObjectId, String> statusByContactId = currentUser.getContacts().stream()
                .collect(Collectors.toMap(Contact::getUserId, Contact::getStatus));
        List<UserDto> contacts = userRepository.findByIdIn(new ArrayList<>(statusByContactId.keySet())).stream()
                .map(user -> new UserDto(user, statusByContactId.get(user.getId()))).toList();
        log.info("Contactos encontrados {}", contacts);
        return ResponseEntity.ok().body(contacts);
    }

    @GetMapping("/me/to")
    public ResponseEntity<List<MessagesDto>> getMessages(@RequestParam String receiverId, Principal principal) {

        String username = principal.getName();
        User currentUser = userRepository.findByUsername(username).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        ObjectId receiverObjectId = new ObjectId(receiverId);
        User receiverUser = userRepository.findById(receiverObjectId).orElse(null);
        if (receiverUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        log.info("Buscando mensajes entre el usaurio {} y el usuario destino {}", username, receiverUser.getUsername());

        Optional<Contact> optionalContact = currentUser.getContacts().stream()
                .filter(contact -> contact.getUserId().equals(receiverUser.getId()))
                .findFirst();
        String statusFilter = "";
        Sort sortByTimestamp = Sort.by(Sort.Direction.DESC, "timestamp");
        int page = 0;
        int size = 25;
        if (optionalContact.isPresent()) {
            log.info("Contacto", optionalContact.get());
            Contact contact = optionalContact.get();
            if ("pendig_acceptance".equals(contact.getStatus())) {
                log.info("Es status pendiente");
                statusFilter = "pendig_acceptance";
                size = 2;
            }
        }
        List<MessagesDto> messages = messageService
                .findMessages(currentUser.getId(), receiverObjectId, statusFilter, page, size, sortByTimestamp)
                .stream()
                .map(MessagesDto::new)
                .toList();

        return ResponseEntity.ok(messages);
    }

    @PutMapping("/me/mark-as-read")
    public ResponseEntity<?> markMessagesAsRead(@RequestBody List<String> messageIds, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }

        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        List<ObjectId> messageIdsList = messageIds.stream().map(ObjectId::new).toList();
        List<Messages> messagesToUpdate = messageService.findMessagesBetweenUsersWithIds(user.getId(),
                messageIdsList);
        log.info("Resultado {}", messagesToUpdate.size());
        for (Messages message : messagesToUpdate) {
            message.setStatus("read");
        }

        messageService.saveAll(messagesToUpdate);

        return ResponseEntity.ok("Messages marked as read");
    }

}

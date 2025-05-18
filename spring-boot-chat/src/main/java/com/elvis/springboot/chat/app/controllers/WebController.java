package com.elvis.springboot.chat.app.controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.elvis.springboot.chat.app.documents.Contact;
import com.elvis.springboot.chat.app.documents.Messages;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.messagues.response.MessagesDto;
import com.elvis.springboot.chat.app.messagues.response.Response;
import com.elvis.springboot.chat.app.messagues.response.UserDto;
import com.elvis.springboot.chat.app.messagues.response.UserDto.LastMessage;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import com.elvis.springboot.chat.app.services.MessageService;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.security.Principal;
import org.bson.types.ObjectId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/er")
public class WebController {

    private final UserRepository userRepository;
    private final MessageService messageService;

    @GetMapping("/me/contacts")
    public ResponseEntity<Response> getMyContacts(Principal principal) {

        if (principal == null || principal.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED.value()).body(new Response(401, "Unhautorized user"));
        }

        final String username = principal.getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<ObjectId> contactIds = currentUser.getContacts().stream()
                .map(Contact::getUserId)
                .toList();

        if (contactIds.isEmpty()) {
            return ResponseEntity.ok(new Response(HttpStatus.OK.value(), "Lista de contactos", new ArrayList<>()));
        }

        List<User> contacts = userRepository.findByIdIn(contactIds);
        Map<ObjectId, Contact> contactMap = currentUser.getContacts().stream()
                .collect(Collectors.toMap(Contact::getUserId, Function.identity()));
        Sort sort = Sort.by(Sort.Direction.DESC, "timestamp");
        List<UserDto> userDtos = contacts.stream()
                .map(user -> {
                    Contact contact = contactMap.get(user.getId());
                    int unreadCount = (contact != null) ? contact.getUnreadMessages() : 0;
                    String status = (contact != null) ? contact.getStatus() : "unknown";

                    // 6. Obtener el último mensaje de forma más eficiente (quizás considerar una
                    // query específica)
                    List<Messages> lastMessageList = messageService.findMessages(user.getId(), currentUser.getId(), "",
                            0, 1, sort);
                    LastMessage lastMessageDto = lastMessageList.isEmpty() ? null
                            : new LastMessage(lastMessageList.get(0).getContent().getBody(),
                                    lastMessageList.get(0).getTimestamp(),
                                    lastMessageList.get(0).getStatus());

                    return new UserDto(user, status, unreadCount, lastMessageDto);
                })
                .toList();
        return ResponseEntity.ok().body(new Response(200, "Contacts list", userDtos));
    }

    @GetMapping("/me/to")
    public ResponseEntity<Response> getMessages(@RequestParam String receiverId, Principal principal) {

        String username = principal.getName();
        User currentUser = userRepository.findByUsername(username).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED.value()).body(new Response(401, "Unhautorized user"));
        }
        ObjectId receiverObjectId = new ObjectId(receiverId);
        User receiverUser = userRepository.findById(receiverObjectId).orElse(null);
        if (receiverUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND.value()).body(new Response(404, "User not found"));
        }
        log.info("Buscando mensajes entre el usaurio {} y el usuario destino {}", username, receiverUser.getUsername());

        Optional<Contact> optionalContact = currentUser.getContacts().stream()
                .filter(contact -> contact.getUserId().equals(receiverUser.getId()))
                .findFirst();
        String statusFilter = "";
        Sort sortByTimestamp = Sort.by(Sort.Direction.ASC, "timestamp");
        int page = 0;
        int size = 100;
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

        return ResponseEntity.ok(new Response(200, messages));
    }

}

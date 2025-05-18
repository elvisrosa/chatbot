package com.elvis.springboot.chat.app.services;

import java.util.List;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.elvis.springboot.chat.app.documents.Contact;
import com.elvis.springboot.chat.app.documents.Messages;
import com.elvis.springboot.chat.app.documents.User;
import com.elvis.springboot.chat.app.messagues.requests.ContactUpdateDto;
import com.elvis.springboot.chat.app.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContactService {

    private final UserRepository userRepository;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void processContactUpdate(String currentUsername, ContactUpdateDto contactUpdateDto) {
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + currentUsername));

        final ObjectId contactUserId;
        try {
            contactUserId = new ObjectId(contactUpdateDto.getContactId());
        } catch (IllegalArgumentException e) {
            // throw new InvalidContacExExtIdException("ID de contacto inválido: " +
            // contactUpdateDto.getContactId());
            throw new UsernameNotFoundException("ID de contacto inválido: " + contactUpdateDto.getContactId());
        }

        User contactUser = userRepository.findById(contactUserId)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario de contacto no encontrado con ID: " + contactUpdateDto.getContactId()));

        Contact contactToUpdate = currentUser.getContacts().stream()
                .filter(c -> c.getUserId().equals(contactUserId))
                .findFirst()
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Contacto no encontrado en la lista del usuario: " + contactUpdateDto.getContactId()));

        final String status = contactUpdateDto.getStatus();
        boolean contactListModified = false;

        switch (status.toLowerCase()) {
            case "contact":
                contactToUpdate.setStatus("contact");
                break;
            case "reject":
                currentUser.getContacts().remove(contactToUpdate);
                contactListModified = true;
                break;
            default:
                // throw new InvalidContactStatusException("Estado de contacto no válido: " +
                // status);
        }

        userRepository.save(currentUser);

        // Actualización de mensajes pendientes
        if (contactListModified || status.equalsIgnoreCase("contact")) {
            List<Messages> pendingMessages = messageService.findMessages(currentUser.getId(), contactUser.getId(),
                    "pendig_acceptance", 0, 10, Sort.by(Sort.Direction.DESC, "timestamp"));
            if (!pendingMessages.isEmpty()) {
                pendingMessages.forEach(msg -> msg.setStatus("send"));
                messageService.saveAll(pendingMessages);
            }
        }

        // Notificaciones también pueden ir aquí si son parte integral del proceso de
        // negocio
        messagingTemplate.convertAndSendToUser(contactUser.getUsername(), "/queue/contact-updated", contactUpdateDto);
        messagingTemplate.convertAndSendToUser(currentUser.getUsername(), "/queue/contact-updated", contactUpdateDto);

        log.info("Notificación de actualización de contacto enviada a {} y {}.", contactUser.getUsername(),
                currentUser.getUsername());
    }

}

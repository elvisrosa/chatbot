package com.elvis.springboot.chat.app.messagues.response;

import java.time.LocalDateTime;
import com.elvis.springboot.chat.app.documents.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class UserDto {
    private String id;
    private String username;
    private String name;
    private String phone;
    private String profilePicture;
    private String statusMessage;
    private boolean online;
    private LocalDateTime lastSeen;
    private String status;
    private int unreadMessages;

    public UserDto(User user, String status, int unreadMessages) {
        this.id = user.getId().toHexString();
        this.username = user.getUsername();
        this.name = user.getName();
        this.phone = user.getPhone();
        this.profilePicture = user.getProfilePicture();
        this.statusMessage = user.getStatusMessage();
        this.online = user.getOnline();
        this.lastSeen = user.getLastSeen();
        this.status = status;
        this.unreadMessages = unreadMessages;
    }

}

package com.elvis.springboot.chat.app.documents;

import org.bson.types.ObjectId;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class Contact {
    private ObjectId userId;
    private String nickname;
    private Boolean isBlocked;
    private String status;
    private int unreadMessages;
}

package com.elvis.springboot.chat.app.documents;

import org.bson.types.ObjectId;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class Contact {
    private ObjectId userId;
    private String nickname;
    private Boolean isBlocked;
    private String status;
}

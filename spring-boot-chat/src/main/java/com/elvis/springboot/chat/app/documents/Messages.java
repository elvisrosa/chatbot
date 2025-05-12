package com.elvis.springboot.chat.app.documents;

import java.time.LocalDateTime;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
@Document(collection = "messages")
public class Messages {

    @Id
    private ObjectId id;
    private ObjectId senderId;
    private ObjectId receiverId;
    private Boolean isGroupMessage;
    private Content content;
    private LocalDateTime timestamp;
    private Boolean edit;
    private String status;

}

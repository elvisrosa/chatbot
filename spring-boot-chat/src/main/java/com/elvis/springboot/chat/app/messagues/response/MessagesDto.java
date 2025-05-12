package com.elvis.springboot.chat.app.messagues.response;

import java.time.LocalDateTime;
import com.elvis.springboot.chat.app.documents.Messages;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class MessagesDto {

    private String id;
    private Boolean isGroupMessage;
    private Content content;
    private LocalDateTime timestamp;
    private Boolean edit;
    private String status;
    private String to;
    private String from;

    @Data
    @AllArgsConstructor
    public class Content {
        private String type;
        private String body;
        private String mediaUrl;
    }

    public MessagesDto(Messages messages) {
        this.id = messages.getId().toHexString();
        this.isGroupMessage = messages.getIsGroupMessage();
        if (messages.getContent() != null) {
            this.content = new Content(messages.getContent().getType(), messages.getContent().getBody(),
                    messages.getContent().getMediaUrl());
        }
        this.edit = messages.getEdit();
        this.timestamp = messages.getTimestamp();
        this.status = messages.getStatus();
        this.to = messages.getReceiverId().toHexString();
        this.from = messages.getSenderId().toHexString();
    }

}

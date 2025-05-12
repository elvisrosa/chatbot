package com.elvis.springboot.chat.app.documents;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class Content {

    private String type;
    private String body;
    private String mediaUrl;

}

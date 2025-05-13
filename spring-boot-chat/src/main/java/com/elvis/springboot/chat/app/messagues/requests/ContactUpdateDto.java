package com.elvis.springboot.chat.app.messagues.requests;

import lombok.Data;

@Data
public class ContactUpdateDto {
    private String contactId;
    private String status;

}

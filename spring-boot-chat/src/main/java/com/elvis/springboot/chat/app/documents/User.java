package com.elvis.springboot.chat.app.documents;

import java.time.LocalDateTime;
import java.util.List;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private ObjectId id;
    private String username;
    @JsonIgnore
    private String password;
    private String phone;
    private String name;
    private String profilePicture;
    private String statusMessage;
    private List<Contact> contacts;
    private List<String> groups;
    private LocalDateTime lastSeen;
    private Boolean online;

}
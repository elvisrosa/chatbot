package com.elvis.springboot.chat.app.repositories;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import com.elvis.springboot.chat.app.documents.Messages;

@Repository
public interface MessagesRepository extends MongoRepository<Messages, ObjectId> {}

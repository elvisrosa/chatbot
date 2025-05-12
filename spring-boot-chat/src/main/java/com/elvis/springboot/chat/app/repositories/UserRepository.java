package com.elvis.springboot.chat.app.repositories;

import java.util.List;
import java.util.Optional;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.elvis.springboot.chat.app.documents.User;

public interface UserRepository extends MongoRepository<User, ObjectId> {

    Optional<User> findById(ObjectId id);
    Optional<User> findByUsername(String username);
    List<User> findByIdIn(List<ObjectId> ids);
    
}

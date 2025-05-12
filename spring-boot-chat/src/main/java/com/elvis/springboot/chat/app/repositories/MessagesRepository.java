package com.elvis.springboot.chat.app.repositories;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import com.elvis.springboot.chat.app.documents.Messages;

public interface MessagesRepository extends MongoRepository<Messages, ObjectId> {

    @Query("""
                {
                    $or: [
                        { 'senderId': ?0, 'receiverId': ?1 },
                        { 'senderId': ?1, 'receiverId': ?0 }
                    ]
                }
            """)
    List<Messages> findMessagesBetweenUsers(ObjectId user1, ObjectId user2, Sort sort);

    @Query("""
                {
                    "$or": [
                        { "receiverId": ?0 },
                    ],
                    "_id": { "$in": ?1 }
                }
            """)
    List<Messages> findMessagesBetweenUsersWithIds(ObjectId receiverId, List<ObjectId> idsMessages);

}

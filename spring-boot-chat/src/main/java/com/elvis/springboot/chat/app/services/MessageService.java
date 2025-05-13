package com.elvis.springboot.chat.app.services;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.elvis.springboot.chat.app.documents.Messages;
import com.elvis.springboot.chat.app.repositories.MessagesRepository;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Service
public class MessageService {

    private final MongoTemplate mongoTemplate;
    private final MessagesRepository messagesRepository;

    public List<Messages> findMessages(ObjectId user1, ObjectId user2, String status, int page, int size, Sort sort) {
        Criteria criteria1 = Criteria.where("senderId").is(user1).and("receiverId").is(user2);
        Criteria criteria2 = Criteria.where("senderId").is(user2).and("receiverId").is(user1);

        if (status != null && !status.isEmpty()) {
            criteria1 = criteria1.and("status").is(status);
            criteria2 = criteria2.and("status").is(status);
        }
        Query query = new Query(new Criteria().orOperator(criteria1, criteria2)).with(sort).skip((long) page * size)
                .limit(size);
        query.with(sort);
        return mongoTemplate.find(query, Messages.class);
    }

    public List<Messages> findMessagesBetweenUsersWithIds(ObjectId receiverId, List<ObjectId> idsMessages) {
        Criteria criteria = new Criteria().andOperator(
                Criteria.where("receiverId").is(receiverId),
                Criteria.where("_id").in(idsMessages));
        return mongoTemplate.find(new Query(criteria), Messages.class);
    }

    public Messages save(Messages messages) {
        return mongoTemplate.save(messages);
    }

    public List<Messages> saveAll(List<Messages> messages) {
        return messagesRepository.saveAll(messages);
    }

    public int countBySenderIdAndReceiverIdAndStatus(ObjectId currentUserid, ObjectId receiverId, String status) {
        Criteria criteria = Criteria.where("senderId").is(currentUserid)
                .and("receiverId").is(receiverId);

        if (status != null && !status.isEmpty()) {
            criteria = criteria.and("status").is(status);
        }

        return (int) mongoTemplate.count(new Query(criteria), Messages.class);
    }

}

package com.eliteshop.repository;

import com.eliteshop.model.PendingPasswordDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Date;
import java.util.Optional;

public interface PendingPasswordRepository extends MongoRepository<PendingPasswordDocument, String> {
    Optional<PendingPasswordDocument> findByEmail(String email);
    void deleteByEmail(String email);
    void deleteByCreatedAtBefore(Date date);
}

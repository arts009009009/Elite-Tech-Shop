package com.eliteshop.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "pending_passwords")
public class PendingPasswordDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password;

    private Date createdAt;

    public PendingPasswordDocument(String email, String password) {
        this.email = email;
        this.password = password;
        this.createdAt = new Date();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}

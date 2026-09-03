
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Date;
import java.util.Optional;

public interface SessionRepository extends MongoRepository<SessionDocument, String> {
    Optional<SessionDocument> findByToken(String token);
    void deleteByToken(String token);
    void deleteByCreatedAtBefore(Date date);
}

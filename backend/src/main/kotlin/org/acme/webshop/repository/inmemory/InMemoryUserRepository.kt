package org.acme.webshop.repository.inmemory

import io.quarkus.arc.profile.UnlessBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.User
import org.acme.webshop.repository.UserRepository
import java.util.concurrent.ConcurrentHashMap

@ApplicationScoped
@UnlessBuildProfile("lambda")
class InMemoryUserRepository : UserRepository {

    private val users = ConcurrentHashMap<String, User>()
    private val emailIndex = ConcurrentHashMap<String, String>()

    override fun save(user: User): User {
        users[user.id] = user
        emailIndex[user.email.lowercase()] = user.id
        return user
    }

    override fun findById(id: String): User? = users[id]

    override fun findByEmail(email: String): User? {
        val userId = emailIndex[email.lowercase()] ?: return null
        return users[userId]
    }

    override fun existsByEmail(email: String): Boolean = emailIndex.containsKey(email.lowercase())
}
